import { useState, useEffect, useCallback } from 'react';
import './App.css';

// ==================== Types ====================
interface IndexData {
  name: string;
  value: number;
  unit: string;
}

interface FundItem {
  id: string;
  name: string;
  code: string; // 基金代码，用于API查询
  returnRate: number;
  estimatedRate?: number; // 估算收益率
  limit?: string;
  lastUpdated?: string;
}

// ==================== Default Fund List ====================
const defaultFunds: FundItem[] = [
  { id: '1', name: '华宝纳斯达克精选', code: '017811', returnRate: 1.35, limit: '限额1000元/天' },
  { id: '2', name: '浦银安盛全球智能科技', code: '005484', returnRate: 3.02 },
  { id: '3', name: '广发全球精选', code: '270023', returnRate: 1.14, limit: '限额5000元/天' },
  { id: '4', name: '嘉实全球产业升级', code: '007384', returnRate: 2.12 },
  { id: '5', name: '嘉实美国成长', code: '000043', returnRate: 0.85, limit: '限额2000元/天' },
  { id: '6', name: '易方达标普信息科技', code: '161128', returnRate: 1.34 },
  { id: '7', name: '易方达全球成长精选', code: '002803', returnRate: 1.31 },
  { id: '8', name: '国富全球科技', code: '001605', returnRate: 3.10, limit: '限额1000元/天' },
  { id: '9', name: '建信新兴市场混合', code: '000105', returnRate: 0.82 },
  { id: '10', name: '汇添富全球移动互联', code: '001668', returnRate: 1.26 },
  { id: '11', name: '华夏全球科技先锋', code: '005619', returnRate: 2.12 },
  { id: '12', name: '华夏移动互联', code: '002891', returnRate: 3.78, limit: '限额2000元/天' },
  { id: '13', name: '嘉实美国消费', code: '501979', returnRate: 1.45 },
  { id: '14', name: '广发纳斯达克100指数', code: '270042', returnRate: 1.62 },
  { id: '15', name: '南方全球精选', code: '202801', returnRate: 0.95 },
];

const indexData: IndexData[] = [
  { name: '纳斯达克', value: 0.86, unit: '%' },
  { name: '纳斯达克100', value: 1.58, unit: '%' },
  { name: '标普500', value: 0.30, unit: '%' },
  { name: '汇率', value: 0.06, unit: '%' },
];

const STORAGE_KEY = 'fund-tracker-list';
const DATA_URL = 'https://raw.githubusercontent.com/llcnihao/fund-tracker/main/data/data.json';
const CACHE_KEY = 'fund-data-cache';
const CACHE_DURATION = 60 * 1000; // 60秒缓存

// ==================== API Functions ====================

/**
 * 获取单个基金实时估值
 * 使用天天基金网API（免费，无需API密钥）
 */
async function fetchFundRealtime(code: string): Promise<{ estimatedRate: number; updateTime: string } | null> {
  try {
    // 天天基金网实时估值API
    const url = `https://fundgz.1234567.com.cn/js/${code}.js`;
    
    // 使用免费的CORS代理
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    
    const response = await fetch(proxyUrl, {
      signal: AbortSignal.timeout(5000) // 5秒超时
    });
    
    if (!response.ok) return null;
    
    const text = await response.text();
    
    // 解析JSONP格式: jsonpgz({"data"})
    const match = text.match(/jsonpgz\((.*)\)/);
    if (!match) return null;
    
    const data = JSON.parse(match[1]);
    
    // data.gszzl 是估算增长率
    const estimatedRate = parseFloat(data.gszzl) || 0;
    const updateTime = data.gztime || new Date().toLocaleTimeString();
    
    return { estimatedRate, updateTime };
  } catch (error) {
    console.error(`获取基金 ${code} 数据失败:`, error);
    return null;
  }
}

/**
 * 批量获取基金数据（并发限制）
 */
async function fetchAllFundsData(funds: FundItem[]): Promise<FundItem[]> {
  const results: FundItem[] = [];
  
  // 限制并发数为3，避免请求过快
  for (let i = 0; i < funds.length; i += 3) {
    const batch = funds.slice(i, i + 3);
    const promises = batch.map(async (fund) => {
      const data = await fetchFundRealtime(fund.code);
      return {
        ...fund,
        estimatedRate: data?.estimatedRate ?? fund.returnRate,
        lastUpdated: data?.updateTime ?? '',
      };
    });
    
    const batchResults = await Promise.all(promises);
    results.push(...batchResults);
    
    // 批次间延迟500ms，避免请求过快
    if (i + 3 < funds.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return results;
}

// ==================== Components ====================

function IndexCard({ data }: { data: IndexData }) {
  const isPositive = data.value >= 0;
  return (
    <div className="flex-1 min-w-[100px] text-center py-3 px-2">
      <div className="text-sm text-[#9ca3af] mb-1">{data.name}</div>
      <div
        className={`text-xl font-bold ${
          isPositive ? 'text-red-500' : 'text-green-500'
        }`}
      >
        {data.value >= 0 ? '+' : ''}{data.value.toFixed(2)}{data.unit}
      </div>
    </div>
  );
}

function FundRow({ fund, onRemove }: { fund: FundItem; onRemove: (id: string) => void }) {
  const displayRate = fund.estimatedRate ?? fund.returnRate;
  const isPositive = displayRate >= 0;
  
  return (
    <div
      className="flex items-center justify-between px-4 py-3 mx-3 mb-2 rounded-lg bg-[#2a2e38] hover:bg-[#323844] transition-colors group"
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="text-[#e5e7eb] text-sm truncate">{fund.name}</span>
        {fund.limit && (
          <span className="shrink-0 text-[10px] bg-amber-900/50 text-amber-400 px-1.5 py-0.5 rounded whitespace-nowrap">
            {fund.limit}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right">
          <div
            className={`text-sm font-semibold ${
              isPositive ? 'text-red-500' : 'text-green-500'
            }`}
          >
            {displayRate >= 0 ? '+' : ''}{displayRate.toFixed(2)}%
          </div>
          {fund.estimatedRate !== undefined && fund.estimatedRate !== fund.returnRate && (
            <div className="text-[10px] text-[#6b7280]">
              估值
            </div>
          )}
        </div>
        <button
          onClick={() => onRemove(fund.id)}
          className="opacity-0 group-hover:opacity-100 text-[#6b7280] hover:text-red-400 transition-all"
          title="删除该基金"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function AddFundModal({ onAdd, onClose }: { onAdd: (fund: FundItem) => void; onClose: () => void }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [returnRate, setReturnRate] = useState('');
  const [limit, setLimit] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;
    onAdd({
      id: Date.now().toString(),
      name: name.trim(),
      code: code.trim(),
      returnRate: parseFloat(returnRate) || 0,
      limit: limit.trim() || undefined,
    });
    setName('');
    setCode('');
    setReturnRate('');
    setLimit('');
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[#23272f] rounded-xl border border-[#2a2e38] p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-[#e5e7eb] mb-4">添加基金</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-[#9ca3af] mb-1">基金名称</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="如：易方达蓝筹精选"
              className="w-full bg-[#1a1d24] border border-[#2a2e38] rounded-lg px-3 py-2 text-sm text-[#e5e7eb] focus:outline-none focus:border-red-500/50"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm text-[#9ca3af] mb-1">基金代码</label>
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="如：110011"
              className="w-full bg-[#1a1d24] border border-[#2a2e38] rounded-lg px-3 py-2 text-sm text-[#e5e7eb] focus:outline-none focus:border-red-500/50"
            />
          </div>
          <div>
            <label className="block text-sm text-[#9ca3af] mb-1">收益率 (%)</label>
            <input
              type="number"
              step="0.01"
              value={returnRate}
              onChange={e => setReturnRate(e.target.value)}
              placeholder="如：1.35"
              className="w-full bg-[#1a1d24] border border-[#2a2e38] rounded-lg px-3 py-2 text-sm text-[#e5e7eb] focus:outline-none focus:border-red-500/50"
            />
          </div>
          <div>
            <label className="block text-sm text-[#9ca3af] mb-1">限额提示（可选）</label>
            <input
              type="text"
              value={limit}
              onChange={e => setLimit(e.target.value)}
              placeholder="如：限额1000元/天"
              className="w-full bg-[#1a1d24] border border-[#2a2e38] rounded-lg px-3 py-2 text-sm text-[#e5e7eb] focus:outline-none focus:border-red-500/50"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-[#2a2e38] hover:bg-[#323844] text-[#e5e7eb] rounded-lg py-2 text-sm transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!name.trim() || !code.trim()}
              className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-900/50 disabled:text-red-300 text-white rounded-lg py-2 text-sm transition-colors"
            >
              添加
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==================== Main App ====================
function App() {
  const [funds, setFunds] = useState<FundItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : defaultFunds;
    } catch {
      return defaultFunds;
    }
  });
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // 保存基金列表到localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(funds));
  }, [funds]);

  // 从 data.json 读取数据
  const fetchDataFromJSON = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const resp = await fetch(DATA_URL);
      if (!resp.ok) throw new Error('请求失败');
      const data = await resp.json();
      if (data.funds && Array.isArray(data.funds)) {
        setFunds(data.funds);
        setLastUpdateTime(data.updateTime || '');
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data.funds));
        return true;
      }
      return false;
    } catch (error) {
      console.error('从 data.json 读取失败:', error);
      return false;
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, []);

  // 获取基金数据（优先从 data.json，失败则用原有方式）
  const fetchData = useCallback(async (showLoading = true) => {
    const success = await fetchDataFromJSON(false);
    if (success) {
      if (showLoading) setIsLoading(false);
      return;
    }
    // 失败：使用原有 API 方式
    if (showLoading) setIsLoading(true);
    try {
      const updatedFunds = await fetchAllFundsData(funds);
      setFunds(updatedFunds);
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      setLastUpdateTime(timeStr);
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data: updatedFunds,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [funds, fetchDataFromJSON]);

  // 初始加载：优先从 data.json 读取
  useEffect(() => {
    const loadData = async () => {
      // 1. 尝试从远程读取
      const success = await fetchDataFromJSON(false);
      if (success) return;
      
      // 2. 失败则从缓存读取
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        try {
          const { data, timestamp } = JSON.parse(cached);
          const isExpired = Date.now() - timestamp > CACHE_DURATION;
          if (!isExpired) {
            setFunds(data);
            const cachedTime = new Date(timestamp);
            setLastUpdateTime(
              `${cachedTime.getHours().toString().padStart(2, '0')}:${cachedTime.getMinutes().toString().padStart(2, '0')}`
            );
            return;
          }
        } catch (e) {}
      }
      
      // 3. 最后使用默认数据
      setFunds(defaultFunds);
      setLastUpdateTime('');
    };
    
    loadData();
  }, [fetchDataFromJSON]);

  // 自动刷新（每60秒从远程读取）
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      fetchDataFromJSON(false);
    }, 60000);
    
    return () => clearInterval(interval);
  }, [autoRefresh, fetchDataFromJSON]);

  const handleAddFund = useCallback((fund: FundItem) => {
    setFunds(prev => [...prev, fund]);
    setShowAddModal(false);
  }, []);

  const handleRemoveFund = useCallback((id: string) => {
    setFunds(prev => prev.filter(f => f.id !== id));
  }, []);

  const handleResetFunds = useCallback(() => {
    setFunds(defaultFunds);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(CACHE_KEY);
  }, []);

  return (
    <div className="min-h-screen bg-[#1a1d24] text-[#e5e7eb]">
      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h1 className="text-xl font-bold text-[#e5e7eb]">基金追踪面板</h1>
          <div className="flex gap-2">
            <button
              onClick={() => fetchData(true)}
              disabled={isLoading}
              className="bg-[#2a2e38] hover:bg-[#323844] disabled:opacity-50 text-[#e5e7eb] text-sm px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  更新中
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  刷新
                </>
              )}
            </button>
            <button
              onClick={() => setAutoRefresh(prev => !prev)}
              className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
                autoRefresh 
                  ? 'bg-green-900/50 text-green-400' 
                  : 'bg-[#2a2e38] text-[#9ca3af] hover:bg-[#323844]'
              }`}
              title={autoRefresh ? '自动刷新已开启' : '自动刷新已关闭'}
            >
              {autoRefresh ? '自动刷新中' : '自动刷新'}
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-1.5 rounded-lg transition-colors"
            >
              + 添加
            </button>
            <button
              onClick={handleResetFunds}
              className="bg-[#2a2e38] hover:bg-[#323844] text-[#9ca3af] text-sm px-3 py-1.5 rounded-lg transition-colors"
              title="恢复默认基金列表"
            >
              重置
            </button>
          </div>
        </div>

        {/* Index Overview Cards */}
        <div className="bg-[#23272f] rounded-xl border border-[#2a2e38] overflow-hidden mb-4">
          <div className="flex flex-wrap divide-x divide-[#2a2e38]">
            {indexData.map((item, i) => (
              <IndexCard key={i} data={item} />
            ))}
          </div>
        </div>

        {/* Update Info */}
        <div className="text-center mb-4">
          <p className="text-xs text-[#6b7280]">
            数据来源：天天基金网 |
            最后更新：<span className="text-red-500">{lastUpdateTime || '--:--'}</span>
            {autoRefresh && <span className="text-green-500 ml-1">● 自动刷新中</span>}
          </p>
        </div>

        {/* Fund List */}
        <div className="bg-[#23272f] rounded-xl border border-[#2a2e38] overflow-hidden py-2">
          {funds.length === 0 ? (
            <div className="text-center py-12 text-[#6b7280] text-sm">
              暂无基金，点击"添加"开始
            </div>
          ) : (
            funds.map((fund) => (
              <FundRow key={fund.id} fund={fund} onRemove={handleRemoveFund} />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-[#4b5563]">
            数据仅供参考，不构成投资建议 · 基金数据每60秒自动更新
          </p>
        </div>
      </main>

      {/* Add Fund Modal */}
      {showAddModal && (
        <AddFundModal onAdd={handleAddFund} onClose={() => setShowAddModal(false)} />
      )}
    </div>
  );
}

export default App;
