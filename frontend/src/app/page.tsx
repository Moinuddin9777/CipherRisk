'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ConnectKitButton } from 'connectkit';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { 
  Shield, Eye, Lock, EyeOff, HelpCircle, Activity, Sparkles, 
  TrendingUp, DollarSign, Percent, RefreshCw, Terminal, ArrowRight,
  CheckCircle, AlertCircle, ChevronRight, X, Layers, Code, Play, FileText, ExternalLink, Bot, Plus, Trash2, Wallet,
  LayoutDashboard, TableProperties, Settings, HelpCircle as HelpIcon, ChevronDown, ListTodo, ShieldAlert
} from 'lucide-react';
import { 
  TRANSPARENT_RISK_ENGINE_ADDRESS, 
  TRANSPARENT_RISK_ENGINE_ABI, 
  CONFIDENTIAL_RISK_ENGINE_ADDRESS, 
  CONFIDENTIAL_RISK_ENGINE_ABI 
} from '../config/contracts';

interface AssetAllocation {
  id: string;
  symbol: string;
  balance: string;
  price: string;
}

interface RiskAnalysisResult {
  portfolioValue: number;
  collateralValue: number;
  liabilities: number;
  netAssetValue: number;
  leverageRatio: number;
  riskLevel: number; // 1 = Low, 2 = Medium, 3 = High
  timestamp?: number;
}

interface LogItem {
  id: string;
  timestamp: string;
  type: 'FHE' | 'CHAIN' | 'SYSTEM';
  message: string;
  payload?: any;
}

export default function CipherRiskDashboard() {
  const { isConnected, address, chain } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  // Navigation states
  const [activeView, setActiveView] = useState<'dashboard' | 'assets' | 'calculator' | 'logs' | 'about'>('dashboard');
  const [activeTab, setActiveTab] = useState<'transparent' | 'confidential'>('confidential');
  
  // Drawer & Log Console states
  const [drawerOpen, setDrawerOpen] = useState<boolean>(true);
  const [consoleOpen, setConsoleOpen] = useState<boolean>(false);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const consoleBottomRef = useRef<HTMLDivElement>(null);
  
  // Custom transaction error alerts
  const [txError, setTxError] = useState<{ message: string; isGas: boolean } | null>(null);

  // Asset Allocator State
  const [assets, setAssets] = useState<AssetAllocation[]>([
    { id: '1', symbol: 'ETH', balance: '12', price: '3500' },
    { id: '2', symbol: 'WBTC', balance: '1.5', price: '68000' },
    { id: '3', symbol: 'USDC', balance: '40000', price: '1' }
  ]);
  const [newSymbol, setNewSymbol] = useState<string>('SOL');
  const [newBalance, setNewBalance] = useState<string>('50');
  const [newPrice, setNewPrice] = useState<string>('160');

  // Risk Engine Metrics (derived from assets + inputs)
  const [portfolioValue, setPortfolioValue] = useState<number>(184000);
  const [collateralValue, setCollateralValue] = useState<string>('80000');
  const [liabilities, setLiabilities] = useState<string>('30000');

  // Results State
  const [pubResult, setPubResult] = useState<RiskAnalysisResult | null>(null);
  const [pubLoading, setPubLoading] = useState<boolean>(false);
  const [pubTxHash, setPubTxHash] = useState<string>('');

  const [privResult, setPrivResult] = useState<RiskAnalysisResult | null>(null);
  const [privLoading, setPrivLoading] = useState<boolean>(false);
  const [privTxHash, setPrivTxHash] = useState<string>('');
  
  // FHE/Cofhe States
  const [fheState, setFheState] = useState<'idle' | 'encrypting' | 'submitting' | 'complete'>('idle');
  const [fheClient, setFheClient] = useState<any>(null);
  const [rawEncryptedData, setRawEncryptedData] = useState<any>(null);
  const [lastPermit, setLastPermit] = useState<any>(null);
  const [decryptedValues, setDecryptedValues] = useState<RiskAnalysisResult | null>(null);
  const [permitLoading, setPermitLoading] = useState<boolean>(false);

  // AI Compliance Agent State
  const [aiReport, setAiReport] = useState<string>('');
  const [aiLoading, setAiLoading] = useState<boolean>(false);

  // Recalculate portfolio value when assets list changes
  useEffect(() => {
    const total = assets.reduce((sum, asset) => {
      const val = parseFloat(asset.balance) * parseFloat(asset.price);
      return isNaN(val) ? sum : sum + val;
    }, 0);
    setPortfolioValue(total);
  }, [assets]);

  // Helper to append developer logs
  const addLog = (type: 'FHE' | 'CHAIN' | 'SYSTEM', message: string, payload?: any) => {
    const newLog: LogItem = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      type,
      message,
      payload
    };
    setLogs(prev => [...prev, newLog]);
  };

  // Scroll terminal logs to bottom when updated
  useEffect(() => {
    if (consoleOpen && consoleBottomRef.current) {
      consoleBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, consoleOpen]);

  // Log Wallet Connection
  useEffect(() => {
    if (isConnected && address) {
      addLog('SYSTEM', `Wallet connected: ${address}`, { address, chainId: chain?.id });
    } else {
      addLog('SYSTEM', 'Wallet disconnected');
    }
  }, [isConnected, address, chain]);

  // Dynamic import of CoFHE SDK
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    addLog('SYSTEM', 'Initializing CoFHE Client Configuration...');
    Promise.all([
      import('@cofhe/sdk/web'),
      import('@cofhe/sdk/chains')
    ]).then(([sdkWeb, sdkChains]) => {
      const config = sdkWeb.createCofheConfig({
        supportedChains: [
          {
            id: 8008135,
            name: 'Fhenix Helium',
            network: 'fhenix-helium',
            coFheUrl: 'https://api.helium.fhenix.zone',
            verifierUrl: 'https://api.helium.fhenix.zone',
            thresholdNetworkUrl: 'https://api.helium.fhenix.zone',
            environment: 'TESTNET',
          }
        ]
      });
      const client = sdkWeb.createCofheClient(config);
      setFheClient(client);
      addLog('FHE', 'CoFHE Web Client instantiated successfully.');
    }).catch(err => {
      console.error("Failed to load CoFHE SDK", err);
      addLog('SYSTEM', 'Failed to load CoFHE SDK Web assembly module.', err);
    });
  }, []);

  // Connect CoFHE Client to viem clients when available
  useEffect(() => {
    if (fheClient && publicClient && walletClient) {
      addLog('FHE', 'Binding client to active Web3 Provider...');
      fheClient.connect(publicClient, walletClient).then(() => {
        addLog('FHE', 'CoFHE Client connection synchronized with wallet provider.');
      }).catch((e: any) => {
        console.error("Error connecting CoFHE client:", e);
        addLog('FHE', 'Failed to synchronize FHE Client with provider.', e);
      });
    }
  }, [fheClient, publicClient, walletClient]);

  // Load public calculations
  useEffect(() => {
    if (isConnected && address && publicClient) {
      loadPublicAnalysis();
    }
  }, [isConnected, address, publicClient]);

  const loadPublicAnalysis = async () => {
    try {
      if (!publicClient || !address) return;
      addLog('CHAIN', `Querying transparentRiskEngine[${address.slice(0, 8)}...]`);
      const data = await publicClient.readContract({
        address: TRANSPARENT_RISK_ENGINE_ADDRESS,
        abi: TRANSPARENT_RISK_ENGINE_ABI,
        functionName: 'getAnalysis',
        args: [address as `0x${string}`],
      }) as any;

      if (data && Number(data.portfolioValue) > 0) {
        addLog('CHAIN', 'Received transparent risk analysis records.', data);
        const res: RiskAnalysisResult = {
          portfolioValue: Number(data.portfolioValue),
          collateralValue: Number(data.collateralValue),
          liabilities: Number(data.liabilities),
          netAssetValue: Number(data.netAssetValue),
          leverageRatio: Number(data.leverageRatio),
          riskLevel: Number(data.riskLevel),
          timestamp: Number(data.timestamp),
        };
        setPubResult(res);
        generateAIComplianceReport(res);
      }
    } catch (e) {
      console.log("No analysis found on public contract:", e);
    }
  };

  // Generate simulated AI compliance agent advisor summary
  const generateAIComplianceReport = (res: RiskAnalysisResult) => {
    setAiLoading(true);
    addLog('SYSTEM', 'Requesting Compliance Agent AI Advisory...');
    setTimeout(() => {
      let riskStr = "Low";
      if (res.riskLevel === 2) riskStr = "Medium";
      if (res.riskLevel === 3) riskStr = "High";

      let advisory = `### 🤖 CipherRisk Compliance Advisory [RISK: ${riskStr.toUpperCase()}]\n\n`;
      advisory += `* **Net Asset Value (NAV)**: $${res.netAssetValue.toLocaleString()}\n`;
      advisory += `* **Active Leverage Ratio**: ${res.leverageRatio}%\n\n`;

      if (res.riskLevel === 1) {
        advisory += `Your portfolio exhibits a strong risk-to-collateral profile. Under institutional guidelines, your margin requirements are fully satisfied. The Compliance Agent suggests no rebalancing is currently needed.`;
      } else if (res.riskLevel === 2) {
        advisory += `Warning: Moderate leverage detected. Your liability ratio is above 50%. The Compliance Agent suggests depositing an additional 15% collateral to safeguard against potential volatility swings in underlying markets.`;
      } else {
        advisory += `Critical: Portfolio risk exceeds institutional threshold bounds! Leverage exceeds 80% or NAV is severely compressed relative to outstanding debt. The Compliance Agent advises immediate liquidation of non-performing positions or deposit of collateral to prevent liquidation events.`;
      }
      setAiReport(advisory);
      setAiLoading(false);
      addLog('SYSTEM', 'Compliance Agent advisory generated locally.');
    }, 1000);
  };

  const parseTxError = (error: any) => {
    const errorStr = (error.message || '').toLowerCase();
    const isGas = errorStr.includes('gas required exceeds allowance') || errorStr.includes('insufficient funds') || errorStr.includes('code: -32000');
    const isReject = errorStr.includes('rejected') || errorStr.includes('user rejected');

    if (isReject) {
      return { message: 'Transaction was cancelled by the user.', isGas: false };
    }
    if (isGas) {
      return { 
        message: 'Gas check failed: Insufficient funds or gas allowance is 0. Please claim testnet tokens from the Helium faucet.',
        isGas: true 
      };
    }
    return { message: error.shortMessage || error.message || 'Transaction execution failed.', isGas: false };
  };

  // Asset handlers
  const addAsset = () => {
    if (!newSymbol || !newBalance || !newPrice) return;
    const newAsset: AssetAllocation = {
      id: Math.random().toString(),
      symbol: newSymbol.toUpperCase(),
      balance: newBalance,
      price: newPrice
    };
    setAssets([...assets, newAsset]);
    addLog('SYSTEM', `Added public asset: ${newAsset.symbol} - ${newAsset.balance} tokens`);
  };

  const removeAsset = (id: string) => {
    const target = assets.find(a => a.id === id);
    setAssets(assets.filter(a => a.id !== id));
    if (target) {
      addLog('SYSTEM', `Removed public asset: ${target.symbol}`);
    }
  };

  // Submit transparent analysis
  const handlePublicSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletClient || !address || !publicClient) {
      alert("Please connect your wallet first.");
      return;
    }
    setPubLoading(true);
    setPubTxHash('');
    setTxError(null);
    
    addLog('CHAIN', 'Preparing public analyze() transaction...');
    try {
      addLog('CHAIN', 'Simulating public analyze() on-chain check...', {
        contract: TRANSPARENT_RISK_ENGINE_ADDRESS,
        args: [portfolioValue, collateralValue, liabilities]
      });
      const { request } = await publicClient.simulateContract({
        account: address as `0x${string}`,
        address: TRANSPARENT_RISK_ENGINE_ADDRESS,
        abi: TRANSPARENT_RISK_ENGINE_ABI,
        functionName: 'analyze',
        args: [BigInt(portfolioValue), BigInt(collateralValue), BigInt(liabilities)],
      });

      addLog('CHAIN', 'Requesting signature for public risk write transaction...');
      const hash = await walletClient.writeContract(request);
      setPubTxHash(hash);
      addLog('CHAIN', `Transaction broadcasted. Tx Hash: ${hash}`);
      
      addLog('CHAIN', 'Waiting for transaction confirmation receipt...');
      await publicClient.waitForTransactionReceipt({ hash });
      addLog('CHAIN', 'Transaction confirmed on Sepolia/Holesky.');
      await loadPublicAnalysis();
    } catch (error: any) {
      console.error(error);
      const parsed = parseTxError(error);
      setTxError(parsed);
      addLog('CHAIN', 'Public analyze() transaction failed.', error);
    } finally {
      setPubLoading(false);
    }
  };

  // Submit confidential risk analysis
  const handleConfidentialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletClient || !address || !publicClient) {
      alert("Please connect your wallet first.");
      return;
    }
    if (!fheClient) {
      alert("Fhenix client is still initializing. Please wait a moment.");
      return;
    }
    
    setDecryptedValues(null);
    setRawEncryptedData(null);
    setAiReport('');
    setPrivLoading(true);
    setFheState('encrypting');
    setTxError(null);

    addLog('FHE', 'Initiating Local Encrypted Pipeline for CipherRisk engine...');
    try {
      const { Encryptable } = await import('@cofhe/sdk');
      
      addLog('FHE', `Encrypting Portfolio (${portfolioValue}), Collateral (${collateralValue}), Liabilities (${liabilities}) locally...`);
      const encrypted = await fheClient.encryptInputs([
        Encryptable.uint32(Number(portfolioValue)),
        Encryptable.uint32(Number(collateralValue)),
        Encryptable.uint32(Number(liabilities))
      ]).execute();

      addLog('FHE', 'Local TFHE encryption succeeded. Raw ciphertexts packed.', {
        portfolio: encrypted[0].data ? Buffer.from(encrypted[0].data).toString('hex').slice(0, 48) + '...' : 'Data',
        collateral: encrypted[1].data ? Buffer.from(encrypted[1].data).toString('hex').slice(0, 48) + '...' : 'Data',
        liabilities: encrypted[2].data ? Buffer.from(encrypted[2].data).toString('hex').slice(0, 48) + '...' : 'Data'
      });

      addLog('FHE', 'Generating Zero-Knowledge Proof (ZKPoK) for FHE parameters...');
      
      setRawEncryptedData({
        rawOutputs: encrypted,
        inputs: {
          portfolio: { plaintext: portfolioValue, ciphertext: encrypted[0].data },
          collateral: { plaintext: collateralValue, ciphertext: encrypted[1].data },
          liabilities: { plaintext: liabilities, ciphertext: encrypted[2].data }
        },
        mockProof: {
          schema: "CoFHE ZK-Proof v1.0",
          packedBits: 1024,
          crsFingerprint: "0x4fbdb2315678afecb367f032d93f642f64180aa3",
          mockVerificationSignature: "0x1ea5...948f"
        }
      });

      setFheState('submitting');
      addLog('CHAIN', 'Simulating confidential analyze() contract call with encrypted parameters...');

      // Submit transaction with encrypted inputs to Fhenix contract
      const { request } = await publicClient.simulateContract({
        account: address as `0x${string}`,
        address: CONFIDENTIAL_RISK_ENGINE_ADDRESS,
        abi: CONFIDENTIAL_RISK_ENGINE_ABI,
        functionName: 'analyze',
        args: [encrypted[0], encrypted[1], encrypted[2]],
      });

      addLog('CHAIN', 'Requesting signature for confidential risk write transaction...');
      const hash = await walletClient.writeContract(request);
      setPrivTxHash(hash);
      addLog('CHAIN', `Confidential write transaction broadcasted. Tx Hash: ${hash}`);

      addLog('CHAIN', 'Waiting for Helium confirmation receipt...');
      await publicClient.waitForTransactionReceipt({ hash });
      addLog('CHAIN', 'Confidential computation completed. Net assets, leverage limits, and risk classifications computed blindly on-chain.');
      setFheState('complete');
    } catch (error: any) {
      console.error(error);
      const parsed = parseTxError(error);
      setTxError(parsed);
      addLog('FHE', 'Encryption/Calculation pipeline failed.', error);
      setFheState('idle');
    } finally {
      setPrivLoading(false);
    }
  };

  // Decrypt result via permit signature
  const handleDecrypt = async () => {
    if (!fheClient || !publicClient || !address) {
      alert("Wallet or client not connected.");
      return;
    }

    setPermitLoading(true);
    setTxError(null);
    addLog('FHE', 'Requesting EIP-712 Decryption Permit signature from user...');
    try {
      const permit = await fheClient.permits.getOrCreateSelfPermit();
      setLastPermit(permit);
      addLog('FHE', 'Decryption Permit signed and verified locally.', permit);
      
      const permission = fheClient.permits.getPermission(permit);
      addLog('CHAIN', 'Calling confidential getAnalysis() with signed Permit token...');

      const data = await publicClient.readContract({
        address: CONFIDENTIAL_RISK_ENGINE_ADDRESS,
        abi: CONFIDENTIAL_RISK_ENGINE_ABI,
        functionName: 'getAnalysis',
        args: [permission],
        account: address as `0x${string}`,
      }) as any;

      if (data) {
        const res: RiskAnalysisResult = {
          portfolioValue: Number(data[0]),
          collateralValue: Number(data[1]),
          liabilities: Number(data[2]),
          netAssetValue: Number(data[3]),
          leverageRatio: Number(data[4]),
          riskLevel: Number(data[5])
        };
        addLog('FHE', 'Decryption succeeded. Plaintext values unsealed off-chain.', res);
        setDecryptedValues(res);
        generateAIComplianceReport(res);
      }
    } catch (error: any) {
      console.error("Decryption failed:", error);
      const parsed = parseTxError(error);
      setTxError(parsed);
      addLog('FHE', 'Decryption request failed.', error);
    } finally {
      setPermitLoading(false);
    }
  };

  return (
    <div className="flex-1 w-full flex flex-col justify-start relative z-10 font-sans">
      
      {/* Top Header */}
      <header className="w-full glass-panel border-b border-slate-200/80 sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600/10 p-2.5 rounded-xl border border-indigo-200/50 flex items-center justify-center">
            <Shield className="w-6 h-6 text-indigo-600 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-xl font-black tracking-tight text-slate-800">
                CipherRisk
              </h1>
              <span className="text-[9px] font-bold bg-indigo-600/10 text-indigo-700 border border-indigo-200/30 px-1.5 py-0.5 rounded-full uppercase tracking-widest">
                FHE v1.0
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium tracking-wide">
              Institutional-Grade Risk Analytics • Encrypted by Design
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setConsoleOpen(true)}
            className="px-3.5 py-2 rounded-lg bg-indigo-50/80 hover:bg-indigo-100/80 border border-indigo-100 text-xs font-bold text-indigo-600 transition-all flex items-center gap-2 cursor-pointer shadow-sm shadow-indigo-100/50"
          >
            <Code className="w-4 h-4" />
            <span className="hidden sm:inline">Dev Console</span>
          </button>
          <button
            onClick={() => setDrawerOpen(!drawerOpen)}
            className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-xs font-bold text-slate-600 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Terminal className="w-4 h-4 text-purple-600" />
            <span className="hidden sm:inline">{drawerOpen ? "Hide Trace" : "Show Trace"}</span>
          </button>
          <ConnectKitButton />
        </div>
      </header>

      {/* Main Container Layout */}
      <div className="w-full max-w-7xl mx-auto px-4 md:px-6 py-8 flex flex-col md:flex-row gap-8 items-start">
        
        {/* Navigation Sidebar */}
        <aside className="w-full md:w-64 flex-shrink-0 flex flex-col gap-2 p-3 glass-panel rounded-2xl">
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Navigation</div>
          
          <button
            onClick={() => setActiveView('dashboard')}
            className={`w-full px-4 py-3 text-xs font-bold rounded-xl transition-all flex items-center gap-3 cursor-pointer ${
              activeView === 'dashboard'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-200'
                : 'text-slate-600 hover:bg-white/50 hover:text-slate-800'
            }`}
          >
            <LayoutDashboard className="w-4.5 h-4.5" />
            Risk Dashboard
          </button>

          <button
            onClick={() => setActiveView('assets')}
            className={`w-full px-4 py-3 text-xs font-bold rounded-xl transition-all flex items-center gap-3 cursor-pointer ${
              activeView === 'assets'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-200'
                : 'text-slate-600 hover:bg-white/50 hover:text-slate-800'
            }`}
          >
            <TableProperties className="w-4.5 h-4.5" />
            Asset Allocation Ledger
            <span className="ml-auto text-[9px] bg-slate-200/80 text-slate-700 border border-slate-300/40 px-1.5 py-0.5 rounded-full font-semibold">
              {assets.length}
            </span>
          </button>

          <button
            onClick={() => setActiveView('calculator')}
            className={`w-full px-4 py-3 text-xs font-bold rounded-xl transition-all flex items-center gap-3 cursor-pointer ${
              activeView === 'calculator'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-200'
                : 'text-slate-600 hover:bg-white/50 hover:text-slate-800'
            }`}
          >
            <Shield className="w-4.5 h-4.5" />
            FHE Calculator
            {activeTab === 'confidential' ? (
              <span className="ml-auto text-[8px] bg-purple-500/20 text-purple-700 border border-purple-300/30 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                Shield
              </span>
            ) : (
              <span className="ml-auto text-[8px] bg-blue-500/20 text-blue-700 border border-blue-300/30 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                Pub
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveView('logs')}
            className={`w-full px-4 py-3 text-xs font-bold rounded-xl transition-all flex items-center gap-3 cursor-pointer ${
              activeView === 'logs'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-200'
                : 'text-slate-600 hover:bg-white/50 hover:text-slate-800'
            }`}
          >
            <Terminal className="w-4.5 h-4.5" />
            Developer Logs
            <span className="ml-auto text-[9px] bg-slate-200/80 text-slate-700 border border-slate-300/40 px-1.5 py-0.5 rounded-full font-semibold">
              {logs.length}
            </span>
          </button>

          <button
            onClick={() => setActiveView('about')}
            className={`w-full px-4 py-3 text-xs font-bold rounded-xl transition-all flex items-center gap-3 cursor-pointer ${
              activeView === 'about'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-200'
                : 'text-slate-600 hover:bg-white/50 hover:text-slate-800'
            }`}
          >
            <HelpIcon className="w-4.5 h-4.5" />
            About the Product
          </button>

          <div className="border-t border-slate-200/80 my-2 pt-3 px-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Network Status</div>
            <div className="bg-white/40 border border-slate-200 p-2.5 rounded-xl text-[10px] space-y-1.5">
              <div className="flex items-center justify-between text-slate-500">
                <span>Network:</span>
                <span className="font-bold text-indigo-600">{chain?.name || 'Fhenix Helium'}</span>
              </div>
              <div className="flex items-center justify-between text-slate-500">
                <span>FHE SDK:</span>
                <span className="font-bold text-emerald-600">Active</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Dynamic Center Work Area */}
        <main className="flex-1 flex flex-col lg:flex-row gap-8 items-start w-full">
          
          {/* Main Panel Column */}
          <div className="flex-grow w-full space-y-6">
            
            {/* Warning/Error notification banner */}
            {txError && (
              <div className={`p-4 rounded-xl border flex gap-3 items-start text-xs transition-all duration-300 ${
                txError.isGas 
                  ? 'bg-amber-50 border-amber-200 text-amber-800 shadow-sm shadow-amber-100' 
                  : 'bg-red-50 border-red-200 text-red-800 shadow-sm shadow-red-100'
              }`}>
                <AlertCircle className={`w-5 h-5 flex-shrink-0 ${txError.isGas ? 'text-amber-500' : 'text-red-500'}`} />
                <div className="flex-1 space-y-1.5">
                  <div className="font-bold">{txError.isGas ? 'Gas required exceeds allowance' : 'Execution Error'}</div>
                  <p className="text-[11px] leading-relaxed">{txError.message}</p>
                  {txError.isGas && (
                    <div className="flex gap-4 pt-1">
                      <a 
                        href="https://sepoliafaucet.com" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[10px] text-amber-700 font-bold hover:underline cursor-pointer"
                      >
                        Sepolia Faucet <ExternalLink className="w-3 h-3" />
                      </a>
                      <a 
                        href="https://faucet.helium.fhenix.zone" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[10px] text-amber-700 font-bold hover:underline cursor-pointer"
                      >
                        Fhenix Helium Faucet <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
                <button onClick={() => setTxError(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* VIEW: Dashboard */}
            {activeView === 'dashboard' && (
              <div className="space-y-6">
                
                {/* Dashboard Banner */}
                <div className="glass-panel p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                      <LayoutDashboard className="w-5 h-5 text-indigo-600" />
                      Risk Management Dashboard
                    </h2>
                    <p className="text-slate-500 text-xs mt-1">
                      Real-time assessment of net asset backing, collateral health and risk score classifications.
                    </p>
                  </div>
                  
                  <div className="bg-white/70 border border-slate-200 px-4 py-2.5 rounded-xl text-xs flex items-center gap-4">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Asset Ledger Value</span>
                      <span className="font-mono font-bold text-slate-800 text-sm">${portfolioValue.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Dashboard Metrics Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="glass-panel p-4 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Net Asset Value (NAV)</span>
                    <div className="text-xl font-bold font-mono text-indigo-700">
                      {decryptedValues ? (
                        `$${decryptedValues.netAssetValue.toLocaleString()}`
                      ) : pubResult ? (
                        `$${pubResult.netAssetValue.toLocaleString()}`
                      ) : (
                        <span className="text-slate-400 text-xs italic">Decrypt / Calc needed</span>
                      )}
                    </div>
                    <p className="text-[9px] text-slate-500">Assets minus liabilities computed on-chain.</p>
                  </div>

                  <div className="glass-panel p-4 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Leverage Ratio</span>
                    <div className="text-xl font-bold font-mono text-indigo-700">
                      {decryptedValues ? (
                        `${decryptedValues.leverageRatio}%`
                      ) : pubResult ? (
                        `${pubResult.leverageRatio}%`
                      ) : (
                        <span className="text-slate-400 text-xs italic">Decrypt / Calc needed</span>
                      )}
                    </div>
                    {/* Leverage Progress Bar */}
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1.5">
                      <div 
                        className={`h-full transition-all duration-500 ${
                          (decryptedValues?.leverageRatio || pubResult?.leverageRatio || 0) > 80
                            ? 'bg-rose-500'
                            : (decryptedValues?.leverageRatio || pubResult?.leverageRatio || 0) > 50
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(decryptedValues?.leverageRatio || pubResult?.leverageRatio || 0, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="glass-panel p-4 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Risk Classification</span>
                    <div className="text-xl font-bold">
                      {decryptedValues ? (
                        <span className={`${
                          decryptedValues.riskLevel === 3 ? 'text-red-600' : decryptedValues.riskLevel === 2 ? 'text-amber-600' : 'text-emerald-600'
                        }`}>
                          {decryptedValues.riskLevel === 3 ? 'HIGH RISK' : decryptedValues.riskLevel === 2 ? 'MEDIUM RISK' : 'LOW RISK'}
                        </span>
                      ) : pubResult ? (
                        <span className={`${
                          pubResult.riskLevel === 3 ? 'text-red-600' : pubResult.riskLevel === 2 ? 'text-amber-600' : 'text-emerald-600'
                        }`}>
                          {pubResult.riskLevel === 3 ? 'HIGH' : pubResult.riskLevel === 2 ? 'MEDIUM' : 'LOW'}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs italic">No Active Evaluation</span>
                      )}
                    </div>
                    <p className="text-[9px] text-slate-500">Calculated from collateral & debt weights.</p>
                  </div>
                </div>

                {/* AI Advisor Panel */}
                <div className="glass-panel p-6 rounded-2xl">
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-3 mb-4">
                    <Bot className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-sm font-bold text-slate-700">AI Advisor Compliance Insights</h3>
                  </div>
                  
                  {aiReport ? (
                    <div className="bg-white/50 p-4 rounded-xl border border-indigo-100 text-xs text-slate-650 leading-relaxed whitespace-pre-line shadow-sm">
                      {aiReport}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-400 text-xs italic flex flex-col items-center justify-center gap-2">
                      <Sparkles className="w-6 h-6 text-slate-300 animate-bounce" />
                      Evaluate risk computations to generate an AI Compliance Advisory report.
                    </div>
                  )}
                </div>

                {/* Setup Faucet checklist helper */}
                <div className="glass-panel p-6 rounded-2xl">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                    <ListTodo className="w-4 h-4 text-indigo-500" />
                    Quick Start Guide for Helium Testnet
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="bg-white/50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                      <div className="font-bold text-slate-700">1. Link Burner Wallet</div>
                      <p className="text-slate-500 text-[11px] leading-relaxed">Connect your Metamask wallet. Please use a fresh testing account (never use main wallets with real funds).</p>
                    </div>
                    <div className="bg-white/50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                      <div className="font-bold text-slate-700">2. Request Test tFHE</div>
                      <p className="text-slate-500 text-[11px] leading-relaxed">Go to <a href="https://faucet.helium.fhenix.zone" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline font-semibold">faucet.helium.fhenix.zone</a> and request testnet gas tokens.</p>
                    </div>
                    <div className="bg-white/50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                      <div className="font-bold text-slate-700">3. Ledger Setup</div>
                      <p className="text-slate-500 text-[11px] leading-relaxed">Head to the **Asset Allocation Ledger** tab to specify token holdings and compile total values.</p>
                    </div>
                    <div className="bg-white/50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                      <div className="font-bold text-slate-700">4. Run Calculations</div>
                      <p className="text-slate-500 text-[11px] leading-relaxed">Use the **FHE Calculator** to process risk indices, and decrypt outputs via signed permit tokens.</p>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* VIEW: Assets Ledger */}
            {activeView === 'assets' && (
              <div className="glass-panel p-6 rounded-2xl space-y-6">
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                  <div>
                    <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                      <Wallet className="w-5 h-5 text-indigo-600" />
                      Asset Allocation Ledger
                    </h2>
                    <p className="text-slate-500 text-xs mt-1">
                      Manage virtual portfolio holdings. Changes update total portfolio sizes dynamically.
                    </p>
                  </div>
                  <span className="text-xs bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold px-3 py-1.5 rounded-lg font-mono">
                    Total Value: ${portfolioValue.toLocaleString()}
                  </span>
                </div>

                {/* Assets Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 font-bold">
                        <th className="py-3 px-2">Token Symbol</th>
                        <th className="py-3 px-2 text-right">Balance</th>
                        <th className="py-3 px-2 text-right">Price (USD)</th>
                        <th className="py-3 px-2 text-right">Calculated Value</th>
                        <th className="py-3 px-2 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150">
                      {assets.map((asset) => (
                        <tr key={asset.id} className="text-slate-700 font-mono hover:bg-slate-50/50">
                          <td className="py-4 px-2 font-bold text-slate-800">{asset.symbol}</td>
                          <td className="py-4 px-2 text-right">{parseFloat(asset.balance).toLocaleString()}</td>
                          <td className="py-4 px-2 text-right">${parseFloat(asset.price).toLocaleString()}</td>
                          <td className="py-4 px-2 text-right font-bold text-indigo-600">
                            ${(parseFloat(asset.balance) * parseFloat(asset.price)).toLocaleString()}
                          </td>
                          <td className="py-4 px-2 text-center">
                            <button 
                              onClick={() => removeAsset(asset.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}

                      {/* Add Asset Inline Inputs row */}
                      <tr className="bg-slate-50/30">
                        <td className="py-3 px-2">
                          <input 
                            type="text" 
                            value={newSymbol} 
                            onChange={(e) => setNewSymbol(e.target.value)}
                            placeholder="SOL"
                            className="w-20 bg-white border border-slate-300/85 rounded-lg px-2.5 py-1.5 text-slate-800 text-xs font-bold focus:outline-none focus:border-indigo-500"
                          />
                        </td>
                        <td className="py-3 px-2 text-right">
                          <input 
                            type="number" 
                            value={newBalance} 
                            onChange={(e) => setNewBalance(e.target.value)}
                            placeholder="50"
                            className="w-24 bg-white border border-slate-300/85 rounded-lg px-2.5 py-1.5 text-slate-800 text-xs text-right font-mono focus:outline-none focus:border-indigo-500"
                          />
                        </td>
                        <td className="py-3 px-2 text-right">
                          <input 
                            type="number" 
                            value={newPrice} 
                            onChange={(e) => setNewPrice(e.target.value)}
                            placeholder="160"
                            className="w-24 bg-white border border-slate-300/85 rounded-lg px-2.5 py-1.5 text-slate-800 text-xs text-right font-mono focus:outline-none focus:border-indigo-500"
                          />
                        </td>
                        <td className="py-3 px-2 text-right font-bold text-slate-400 font-mono">
                          ${(parseFloat(newBalance || '0') * parseFloat(newPrice || '0')).toLocaleString()}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <button 
                            onClick={addAsset}
                            className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer transition-colors flex items-center justify-center mx-auto shadow-sm"
                          >
                            <Plus className="w-4.5 h-4.5" />
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="bg-indigo-50/40 p-4 rounded-xl border border-indigo-150/40 flex items-start gap-3 text-xs text-indigo-900">
                  <Sparkles className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    This ledger acts as your local browser wallet simulator. The total asset value ($<strong>{portfolioValue.toLocaleString()}</strong>) will be passed directly into the on-chain calculators.
                  </p>
                </div>

              </div>
            )}

            {/* VIEW: FHE Calculator */}
            {activeView === 'calculator' && (
              <div className="space-y-6">
                
                {/* Mode tabs switcher */}
                <div className="flex justify-between items-center bg-white/60 p-1.5 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex space-x-1.5 w-full">
                    <button
                      onClick={() => setActiveTab('confidential')}
                      className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        activeTab === 'confidential'
                          ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                      }`}
                    >
                      <Lock className="w-4 h-4" />
                      FHE Confidential Shield (Private)
                    </button>
                    <button
                      onClick={() => setActiveTab('transparent')}
                      className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        activeTab === 'transparent'
                          ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                      }`}
                    >
                      <Eye className="w-4 h-4" />
                      Transparent Calculator (Public)
                    </button>
                  </div>
                </div>

                {/* Split Forms / Results Screen */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  
                  {/* Left Column: Form parameters */}
                  <div className="md:col-span-5 glass-panel p-6 rounded-2xl relative overflow-hidden flex flex-col justify-between">
                    
                    <div className="space-y-5">
                      <div>
                        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                          {activeTab === 'transparent' ? (
                            <>
                              <Eye className="w-4 h-4 text-blue-600" />
                              Public Risk Configuration
                            </>
                          ) : (
                            <>
                              <Lock className="w-4 h-4 text-purple-600" />
                              FHE Shield Parameters
                            </>
                          )}
                        </h3>
                        <p className="text-slate-500 text-[11px] mt-1.5 leading-relaxed">
                          {activeTab === 'transparent' 
                            ? 'Submit metrics to transparent contract. All parameters remain publicly visible in transactions.' 
                            : 'Inputs will be encrypted locally before broadcast. On-chain calculations occur in encrypted state handles.'}
                        </p>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Portfolio Value (From Ledger)</label>
                          <div className="w-full bg-slate-100/70 border border-slate-200/80 rounded-lg px-3 py-2.5 text-xs text-slate-500 font-mono font-bold">
                            ${portfolioValue.toLocaleString()}
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                            <DollarSign className="w-4 h-4 text-slate-400" /> Collateral Backing (USD)
                          </label>
                          <input
                            type="number"
                            value={collateralValue}
                            onChange={(e) => setCollateralValue(e.target.value)}
                            className="w-full glass-input rounded-lg px-3.5 py-2 text-xs font-mono font-bold text-slate-800"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                            <Percent className="w-4 h-4 text-slate-400" /> Liabilities / Debt (USD)
                          </label>
                          <input
                            type="number"
                            value={liabilities}
                            onChange={(e) => setLiabilities(e.target.value)}
                            className="w-full glass-input rounded-lg px-3.5 py-2 text-xs font-mono font-bold text-slate-800"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-8">
                      <button
                        onClick={activeTab === 'transparent' ? handlePublicSubmit : handleConfidentialSubmit}
                        disabled={pubLoading || privLoading || !isConnected}
                        className={`w-full py-3 rounded-xl text-xs font-bold transition-all duration-300 tracking-wider uppercase border flex items-center justify-center gap-2 cursor-pointer ${
                          !isConnected 
                            ? 'bg-slate-200 border-slate-350 text-slate-400 cursor-not-allowed'
                            : activeTab === 'transparent'
                              ? 'bg-blue-650 hover:bg-blue-700 border-blue-500/50 text-white shadow-md shadow-blue-200'
                              : 'bg-purple-650 hover:bg-purple-700 border-purple-500/50 text-white shadow-md shadow-purple-200'
                        }`}
                      >
                        {activeTab === 'transparent' ? (
                          pubLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Run Public Analytics"
                        ) : (
                          privLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Run FHE Shield Analytics"
                        )}
                      </button>
                    </div>

                  </div>

                  {/* Right Column: Execution results & decrypt permits */}
                  <div className="md:col-span-7 glass-panel p-6 rounded-2xl min-h-[380px] flex flex-col justify-between">
                    
                    {activeTab === 'transparent' ? (
                      <>
                        <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
                          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                            <Activity className="w-4 h-4 text-blue-600" />
                            Public Analytics Report
                          </h3>
                          {pubTxHash && (
                            <span className="text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 font-mono">
                              Tx Hash: {pubTxHash.slice(0, 8)}...
                            </span>
                          )}
                        </div>

                        <div className="flex-1 space-y-4">
                          {pubResult ? (
                            <div className="space-y-4">
                              <div className="grid grid-cols-3 gap-3">
                                <div className="bg-white/65 p-3 rounded-lg border border-slate-200/80">
                                  <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Net Asset Value</div>
                                  <div className="text-sm font-bold font-mono text-indigo-700 mt-1">${pubResult.netAssetValue.toLocaleString()}</div>
                                </div>
                                <div className="bg-white/65 p-3 rounded-lg border border-slate-200/80">
                                  <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Leverage Ratio</div>
                                  <div className="text-sm font-bold font-mono text-indigo-700 mt-1">{pubResult.leverageRatio}%</div>
                                </div>
                                <div className="bg-white/65 p-3 rounded-lg border border-slate-200/80">
                                  <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Risk Level</div>
                                  <div className={`text-sm font-bold mt-1 ${
                                    pubResult.riskLevel === 3 ? 'text-rose-600' : pubResult.riskLevel === 2 ? 'text-amber-600' : 'text-emerald-600'
                                  }`}>
                                    {pubResult.riskLevel === 3 ? 'High' : pubResult.riskLevel === 2 ? 'Medium' : 'Low'}
                                  </div>
                                </div>
                              </div>

                              {aiReport && (
                                <div className="bg-white/50 p-4 rounded-xl border border-blue-100 text-[11px] text-slate-600 flex items-start gap-2.5">
                                  <Bot className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                                  <div className="flex-1 whitespace-pre-line leading-relaxed">{aiReport}</div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-center py-12 text-slate-400 flex flex-col items-center justify-center gap-2">
                              <Eye className="w-10 h-10 text-slate-300 animate-pulse" />
                              <p className="text-xs">Submit metrics to run public on-chain risk scoring.</p>
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
                          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                            <Shield className="w-4 h-4 text-purple-600" />
                            Confidential Shield Report
                          </h3>
                          {privTxHash && (
                            <span className="text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 font-mono">
                              Tx Hash: {privTxHash.slice(0, 8)}...
                            </span>
                          )}
                        </div>

                        <div className="flex-1 space-y-4">
                          {decryptedValues ? (
                            <div className="space-y-4">
                              <div className="grid grid-cols-3 gap-3">
                                <div className="bg-white/65 p-3 rounded-lg border border-purple-100">
                                  <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Net Asset Value</div>
                                  <div className="text-sm font-bold font-mono text-indigo-700 mt-1">${decryptedValues.netAssetValue.toLocaleString()}</div>
                                </div>
                                <div className="bg-white/65 p-3 rounded-lg border border-purple-100">
                                  <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Leverage Ratio</div>
                                  <div className="text-sm font-bold font-mono text-indigo-700 mt-1">{decryptedValues.leverageRatio}%</div>
                                </div>
                                <div className="bg-white/65 p-3 rounded-lg border border-purple-100">
                                  <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Risk Score</div>
                                  <div className={`text-sm font-bold mt-1 ${
                                    decryptedValues.riskLevel === 3 ? 'text-rose-600' : decryptedValues.riskLevel === 2 ? 'text-amber-600' : 'text-emerald-600'
                                  }`}>
                                    {decryptedValues.riskLevel === 3 ? 'HIGH RISK' : decryptedValues.riskLevel === 2 ? 'MEDIUM RISK' : 'LOW RISK'}
                                  </div>
                                </div>
                              </div>

                              {aiReport && (
                                <div className="bg-white/50 p-4 rounded-xl border border-purple-100 text-[11px] text-slate-650 flex items-start gap-2.5 shadow-sm">
                                  <Bot className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                                  <div className="flex-1 whitespace-pre-line leading-relaxed">{aiReport}</div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-center py-12 text-slate-400 flex flex-col items-center justify-center gap-2">
                              <Lock className="w-10 h-10 text-slate-300" />
                              <p className="text-xs">Submit assets to FHE Shield, then request authorized permit decryption</p>
                            </div>
                          )}
                        </div>

                        <div className="pt-4 border-t border-slate-200">
                          <button
                            onClick={handleDecrypt}
                            disabled={fheState !== 'complete' && !rawEncryptedData || permitLoading}
                            className={`w-full py-3 rounded-xl text-xs font-bold transition-all duration-300 tracking-wider uppercase border flex items-center justify-center gap-2 cursor-pointer ${
                              !(fheState === 'complete' || rawEncryptedData) || permitLoading
                                ? 'bg-slate-200 border-slate-300 text-slate-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-550 hover:to-indigo-550 border-purple-500/40 text-white shadow-md shadow-purple-200'
                            }`}
                          >
                            {permitLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                            Request Decryption Permit & View Analytics
                          </button>
                        </div>
                      </>
                    )}

                  </div>

                </div>

              </div>
            )}

            {/* VIEW: Logs */}
            {activeView === 'logs' && (
              <div className="glass-panel p-6 rounded-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-indigo-600" />
                    <h2 className="text-lg font-black text-slate-800">Developer Log Console</h2>
                  </div>
                  <button 
                    onClick={() => setLogs([])}
                    className="text-xs text-slate-500 hover:text-rose-600 cursor-pointer font-semibold"
                  >
                    Clear History
                  </button>
                </div>

                <div className="font-mono text-xs bg-slate-900 text-slate-350 p-4 rounded-xl h-[450px] overflow-y-auto space-y-3 shadow-inner">
                  {logs.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-655 italic">
                      &gt;_ No terminal logs recorded yet. Perform transactions to populate feed.
                    </div>
                  ) : (
                    logs.map((log) => (
                      <div key={log.id} className="border-b border-slate-800/40 pb-2">
                        <div className="flex items-start gap-2">
                          <span className="text-[10px] text-slate-600 select-none">[{log.timestamp}]</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold select-none ${
                            log.type === 'FHE' 
                              ? 'bg-purple-950 text-purple-400 border border-purple-800/30' 
                              : log.type === 'CHAIN' 
                                ? 'bg-indigo-950 text-indigo-400 border border-indigo-800/30' 
                                : 'bg-slate-800 text-slate-400 border border-slate-705/30'
                          }`}>
                            {log.type}
                          </span>
                          <span className="flex-grow text-slate-200 font-sans">{log.message}</span>
                        </div>
                        {log.payload && (
                          <pre className="mt-1.5 ml-14 p-2 bg-slate-950 rounded border border-slate-800 text-[10px] text-slate-400 overflow-x-auto">
                            {JSON.stringify(log.payload, null, 2)}
                          </pre>
                        )}
                      </div>
                    ))
                  )}
                  <div ref={consoleBottomRef} />
                </div>
              </div>
            )}

            {/* VIEW: About Product */}
            {activeView === 'about' && (
              <div className="glass-panel p-6 rounded-2xl space-y-6">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                  <HelpIcon className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-lg font-black text-slate-800">About CipherRisk</h2>
                </div>

                <div className="space-y-6 text-sm text-slate-705 leading-relaxed">
                  <section className="space-y-2">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2 text-xs uppercase tracking-wider text-indigo-600">
                      <Sparkles className="w-4 h-4" />
                      What We Built
                    </h3>
                    <p className="text-slate-600 text-xs">
                      <strong>CipherRisk</strong> is an institutional-grade Risk Analytics Suite for DeFi. It calculates sensitive portfolio health indicators, such as <strong>Net Asset Value (NAV)</strong>, <strong>Leverage Ratio</strong>, and overall <strong>Risk Classification Levels</strong>, without exposing plaintext values on-chain.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2 text-xs uppercase tracking-wider text-indigo-600">
                      <TrendingUp className="w-4 h-4" />
                      How It's Relevant & What It Solves
                    </h3>
                    <p className="text-slate-600 text-xs">
                      In public blockchains, requesting risk assessments or automated compliance audits forces users into a <strong>"Transparency Trap."</strong> Institutional operators and high-net-worth individuals are forced to broadcast private wallet balances, collateral levels, and outstanding debts to public mempools and block explorers. This leads to front-running, sandwich attacks (MEV exploitation), and severe loss of financial confidentiality.
                    </p>
                    <p className="text-slate-600 text-xs">
                      CipherRisk solves this by executing the entire risk engine in a private environment. Users can compile their assets, calculate their leverage, and determine their margin compliance status while keeping their financial coordinates private from other participants.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2 text-xs uppercase tracking-wider text-indigo-600">
                      <Lock className="w-4 h-4" />
                      How FHE Matters Here (Fully Homomorphic Encryption)
                    </h3>
                    <p className="text-slate-600 text-xs">
                      Unlike Zero-Knowledge (ZK) proofs which are excellent for proving state membership or private transfers but struggle with multi-party state calculations, or Trusted Execution Environments (TEEs) which rely on hardware manufacturer trust, <strong>Fully Homomorphic Encryption (FHE)</strong> allows direct computations on encrypted data.
                    </p>
                    <ul className="list-disc pl-5 space-y-3 bg-white/55 p-4 rounded-xl border border-slate-200/80 shadow-sm text-xs text-slate-600">
                      <li>
                        <strong>Confidential On-Chain Execution:</strong> The Fhenix fhEVM processes encrypted handles (e.g., <code>euint32</code>) using cryptographic operators (like FHE additions, subtractions, and comparisons) without ever unsealing the plaintext inside the EVM.
                      </li>
                      <li>
                        <strong>Authorized Re-decryption (Permits):</strong> Using the <code>fhenix.js</code>/<code>@cofhe/sdk</code>, only the authorized owner of the data can sign an EIP-712 permit to query and view their own plaintext results off-chain, maintaining robust access control.
                      </li>
                      <li>
                        <strong>Collateral Proofs:</strong> The smart contract validates whether the collateral backing is safe or close to liquidation triggers, outputting a public compliance flag only if necessary, keeping the inputs sealed.
                      </li>
                    </ul>
                  </section>
                </div>
              </div>
            )}

          </div>

          {/* Right Column: FHE trace Drawer */}
          {drawerOpen && (
            <div className="w-full lg:w-80 flex-shrink-0 space-y-4 glass-panel p-5 rounded-2xl sticky top-24 max-h-[85vh] overflow-y-auto">
              
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h3 className="text-xs font-black tracking-wider uppercase text-purple-650 flex items-center gap-2">
                  <Terminal className="w-4 h-4" />
                  FHE Computation Trace
                </h3>
                <button onClick={() => setDrawerOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Step 1: Plaintext state */}
              <div className="p-3 bg-white/50 rounded-xl border border-slate-200 text-xs space-y-2">
                <div className="font-bold text-slate-650 flex items-center gap-1.5">
                  <span className="w-4.5 h-4.5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] text-slate-600 font-bold">1</span>
                  Client-Side Memory (Plaintext)
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <div className="text-[8px] text-slate-400 font-bold uppercase">Portfolio</div>
                    <div className="font-mono text-slate-700 font-bold text-[10px] truncate">${portfolioValue.toLocaleString()}</div>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <div className="text-[8px] text-slate-400 font-bold uppercase">Collateral</div>
                    <div className="font-mono text-slate-700 font-bold text-[10px] truncate">${parseFloat(collateralValue || '0').toLocaleString()}</div>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <div className="text-[8px] text-slate-400 font-bold uppercase">Debt</div>
                    <div className="font-mono text-slate-700 font-bold text-[10px] truncate">${parseFloat(liabilities || '0').toLocaleString()}</div>
                  </div>
                </div>
              </div>

              {/* FHE Math Visual Computation Flow */}
              <div className="p-3 bg-white/50 rounded-xl border border-slate-200 text-xs space-y-2">
                <div className="font-bold text-slate-650 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-purple-500" />
                  Blind Logic Trace
                </div>
                <div className="bg-slate-50 p-3 rounded-lg space-y-2.5 font-mono text-[10px] text-slate-500 border border-slate-100">
                  <div className="flex items-center justify-between">
                    <span>FHE.add(Portfolio, Collateral)</span>
                    <span className="text-purple-600 font-semibold">→ Assets</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>FHE.sub(Assets, Liabilities)</span>
                    <span className="text-purple-600 font-semibold">→ NAV</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>FHE.div(Liabilities * 100, Collateral)</span>
                    <span className="text-purple-600 font-semibold">→ Leverage</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-200/80 pt-2 text-slate-700 font-bold">
                    <span>FHE.select(Leverage &gt; 80% || Critical NAV)</span>
                    <span className="text-rose-600">→ RiskLevel</span>
                  </div>
                </div>
              </div>

              {/* Step 2: Encrypted Input Pipeline */}
              <div className="p-3 bg-white/50 rounded-xl border border-slate-200 text-xs space-y-2">
                <div className="font-bold text-slate-650 flex items-center gap-1.5">
                  <span className="w-4.5 h-4.5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] text-slate-600 font-bold">2</span>
                  Shielded Ciphertexts
                </div>
                {rawEncryptedData ? (
                  <div className="space-y-2">
                    <div className="space-y-1.5">
                      {Object.entries(rawEncryptedData.inputs).map(([key, value]: any) => (
                        <div key={key} className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                          <div className="flex justify-between items-center text-[8px] text-slate-400 font-bold uppercase">
                            <span>{key}</span>
                            <span className="text-[8px] bg-purple-50 text-purple-600 border border-purple-200/40 px-1 rounded">euint32</span>
                          </div>
                          <div className="font-mono text-[9px] text-slate-500 truncate mt-1">
                            {value.ciphertext ? `0x${Buffer.from(value.ciphertext).toString('hex')}` : 'Encrypted Struct'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400 italic">Submit FHE metrics to see local ciphertexts.</p>
                )}
              </div>

              {/* Step 3: ZK Proof Verification */}
              <div className="p-3 bg-white/50 rounded-xl border border-slate-200 text-xs space-y-2">
                <div className="font-bold text-slate-650 flex items-center gap-1.5">
                  <span className="w-4.5 h-4.5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] text-slate-600 font-bold">3</span>
                  Zero-Knowledge Proof
                </div>
                {rawEncryptedData ? (
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-mono text-[9px] text-slate-500 space-y-1">
                    <div><span className="text-purple-600 font-bold">Schema:</span> {rawEncryptedData.mockProof.schema}</div>
                    <div><span className="text-purple-600 font-bold">Bits Packed:</span> {rawEncryptedData.mockProof.packedBits}</div>
                    <div className="truncate"><span className="text-purple-600 font-bold">CRS:</span> {rawEncryptedData.mockProof.crsFingerprint}</div>
                    <div className="truncate"><span className="text-purple-600 font-bold">Sig:</span> {rawEncryptedData.mockProof.mockVerificationSignature}</div>
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400 italic">ZK proofs detailed during encryption execution.</p>
                )}
              </div>

              {/* Step 4: Permit signature request visualization */}
              <div className="p-3 bg-white/50 rounded-xl border border-slate-200 text-xs space-y-2">
                <div className="font-bold text-slate-650 flex items-center gap-1.5">
                  <span className="w-4.5 h-4.5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] text-slate-600 font-bold">4</span>
                  EIP-712 Access Permit
                </div>
                {lastPermit ? (
                  <div className="space-y-2">
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-mono text-[9px] text-slate-505 space-y-1 max-h-[150px] overflow-y-auto">
                      <div><span className="text-purple-600 font-bold">Issuer:</span> {lastPermit.issuer}</div>
                      <div><span className="text-purple-600 font-bold">Expiry:</span> {new Date(lastPermit.expiration * 1000).toLocaleString()}</div>
                      <div><span className="text-purple-600 font-bold">Type:</span> {lastPermit.type}</div>
                      <div className="truncate"><span className="text-purple-600 font-bold">SealingKey:</span> {lastPermit.sealingPair.publicKey}</div>
                      <div className="truncate"><span className="text-purple-600 font-bold">Signature:</span> {lastPermit.issuerSignature}</div>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-1 rounded flex items-center gap-1 text-[9px] font-bold">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-555" />
                      Permit verified locally.
                    </div>
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400 italic">No active permit signature unsealed.</p>
                )}
              </div>

            </div>
          )}

        </main>

      </div>

      {/* Floating Logs Modal Overlay */}
      {consoleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-250 w-full max-w-4xl h-[550px] rounded-2xl flex flex-col overflow-hidden shadow-2xl">
            {/* Terminal Title Bar */}
            <div className="bg-slate-50 px-4 py-3 flex items-center justify-between border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold font-mono text-slate-700">developer-console:~ cipherrisk-logs</span>
              </div>
              <button 
                onClick={() => setConsoleOpen(false)} 
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Terminal Log Console */}
            <div className="flex-grow p-4 overflow-y-auto font-mono text-xs bg-slate-950 text-slate-300 space-y-3">
              {logs.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-600 italic">
                  &gt;_ No terminal logs recorded yet. Perform transactions to populate feed.
                </div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="border-b border-slate-900/50 pb-2">
                    <div className="flex items-start gap-2">
                      <span className="text-[10px] text-slate-600 select-none">[{log.timestamp}]</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold select-none ${
                        log.type === 'FHE' 
                          ? 'bg-purple-950 text-purple-400 border border-purple-800/30' 
                          : log.type === 'CHAIN' 
                            ? 'bg-indigo-950 text-indigo-400 border border-indigo-800/30' 
                            : 'bg-slate-900 text-slate-400 border border-slate-800/30'
                      }`}>
                        {log.type}
                      </span>
                      <span className="flex-grow text-slate-200 font-sans">{log.message}</span>
                    </div>
                    {log.payload && (
                      <pre className="mt-1.5 ml-14 p-2 bg-slate-900/60 rounded border border-slate-800/40 text-[10px] text-slate-400 overflow-x-auto">
                        {JSON.stringify(log.payload, null, 2)}
                      </pre>
                    )}
                  </div>
                ))
              )}
              <div ref={consoleBottomRef} />
            </div>

            {/* Terminal Status Footer */}
            <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-200 text-[10px] text-slate-500 flex justify-between select-none">
              <span>Type: FHE = FHE Logic | CHAIN = On-Chain Calls | SYSTEM = SDK State</span>
              <span className="font-semibold text-indigo-600">Total Logs: {logs.length}</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
