import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { Profile, TestResult, UserInfo } from '../types';

const USER_ID_PREFIXES = [
  'All Users',
  'PHBYUGH',
  'PHBYUNG',
  'PHBYUZA',
  'PHLG',
  'PHCB',
  'PHCBIT',
  'PHBYU',
  'PHCEC',
  'PHBYUMG',
  'PHBYUCG',
  'PHCITU',
  'PHJJ',
  'PHNX',
  'PHBYUDRC',
  'PHBYUUG',
  'PHLWP',
  'PHUCLM',
  'PHCTU',
  'PHUCMC',
  'No Prefix'
];

const VALID_PREFIXES = USER_ID_PREFIXES.filter(p => p !== 'All Users' && p !== 'No Prefix');

const PAGE_SIZE = 50;

const LoaderIcon: React.FC = () => (
  <div className="flex justify-center items-center h-64">
    <svg className="animate-spin h-8 w-8 text-lifewood-saffaron" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  </div>
);

const exportToCsv = (filename: string, rows: object[]) => {
  if (!rows || rows.length === 0) { alert("No data to export for the current filter."); return; }
  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(','),
    ...rows.map(row => headers.map(header => {
      let cellValue = (row as any)[header];
      if (cellValue === null || cellValue === undefined) return '';
      let cell = String(cellValue);
      if (cell.search(/("|,|\n)/g) >= 0) cell = `"${cell.replace(/"/g, '""')}"`;
      return cell;
    }).join(','))
  ].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const hasTypoPrefix = (userId: string): boolean => {
  const hasValid = VALID_PREFIXES.some(p => userId.startsWith(p));
  if (hasValid) return false;
  return VALID_PREFIXES.some(p => {
    for (let i = 1; i < p.length && i < userId.length; i++) {
      const variant = p.slice(0, i) + userId[i] + p.slice(i);
      if (userId.startsWith(variant)) return true;
    }
    return false;
  });
};

type SortDir = 'asc' | 'desc';

const SortIcon: React.FC<{ active: boolean; dir: SortDir }> = ({ active, dir }) => (
  <span className={`ml-1 inline-block ${active ? 'text-lifewood-saffaron' : 'text-gray-600'}`}>
    {active ? (dir === 'asc' ? '▲' : '▼') : '⇅'}
  </span>
);

interface MergedProfile extends Profile {
  first_name?: string;
  last_name?: string;
  email?: string;
  country?: string;
  has_test_result: boolean;
  has_typo: boolean;
}

const AdminDashboard: React.FC<{ onSignOut: () => void }> = ({ onSignOut }) => {
  const [activeTab, setActiveTab] = useState<'profiles' | 'results'>('profiles');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [userInfoMap, setUserInfoMap] = useState<Map<string, UserInfo>>(new Map());
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [profilesFilter, setProfilesFilter] = useState('All Users');
  const [resultsFilter, setResultsFilter] = useState('All Users');
  const [searchQuery, setSearchQuery] = useState('');
  const [passFilter, setPassFilter] = useState<'all' | 'pass' | 'fail'>('all');

  const [profileSort, setProfileSort] = useState<{ key: string; dir: SortDir }>({ key: 'created_at', dir: 'desc' });
  const [resultSort, setResultSort] = useState<{ key: string; dir: SortDir }>({ key: 'created_at', dir: 'desc' });

  const [profilePage, setProfilePage] = useState(1);
  const [resultPage, setResultPage] = useState(1);

  const fetchAllRows = async (table: string, orderCol = 'created_at') => {
    const pageSize = 1000;
    let from = 0;
    let allRows: any[] = [];
    while (true) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .order(orderCol, { ascending: false })
        .range(from, from + pageSize - 1);
      if (error) throw error;
      allRows = allRows.concat(data || []);
      if (!data || data.length < pageSize) break;
      from += pageSize;
    }
    return allRows;
  };

  const fetchData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const [profilesData, userInfoData, resultsData] = await Promise.all([
        fetchAllRows('profiles'),
        fetchAllRows('user_info'),
        fetchAllRows('test_results'),
      ]);

      setProfiles(profilesData);
      const infoMap = new Map<string, UserInfo>();
      userInfoData.forEach((u: UserInfo) => infoMap.set(u.user_id, u));
      setUserInfoMap(infoMap);
      setTestResults(resultsData);
    } catch (err: any) {
      console.error("Error fetching admin data:", err);
      setError(`Failed to fetch data: ${err.message}. Please check RLS policies.`);
    } finally {
      if (!isRefresh) setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const testResultUserIds = useMemo(() => new Set(testResults.map(r => r.user_id)), [testResults]);

  const isUserWithoutPrefix = (userId: string) =>
    !VALID_PREFIXES.some(prefix => userId.startsWith(prefix));

  const mergedProfiles = useMemo<MergedProfile[]>(() =>
    profiles.map(p => ({
      ...p,
      ...userInfoMap.get(p.user_id),
      has_test_result: testResultUserIds.has(p.user_id),
      has_typo: hasTypoPrefix(p.user_id),
    })),
    [profiles, userInfoMap, testResultUserIds]
  );

  const stats = useMemo(() => {
    const totalUsers = profiles.length;
    const withResults = testResultUserIds.size;
    const withoutResults = totalUsers - withResults;
    const passed = testResults.filter(r => r.pass_status === true).length;
    const passRate = testResults.length > 0 ? Math.round((passed / testResults.length) * 100) : 0;
    const typoCount = mergedProfiles.filter(p => p.has_typo).length;
    return { totalUsers, withResults, withoutResults, passRate, typoCount };
  }, [profiles, testResultUserIds, testResults, mergedProfiles]);

  const applySort = <T extends object>(data: T[], key: string, dir: SortDir): T[] => {
    return [...data].sort((a, b) => {
      const av = (a as any)[key];
      const bv = (b as any)[key];
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return dir === 'asc' ? cmp : -cmp;
    });
  };

  const filteredProfiles = useMemo(() => {
    let filtered = mergedProfiles;
    if (profilesFilter === 'No Prefix') filtered = filtered.filter(p => isUserWithoutPrefix(p.user_id));
    else if (profilesFilter !== 'All Users') filtered = filtered.filter(p => p.user_id.startsWith(profilesFilter));
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.user_id.toLowerCase().includes(q) ||
        (p.first_name || '').toLowerCase().includes(q) ||
        (p.last_name || '').toLowerCase().includes(q) ||
        `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase().includes(q)
      );
    }
    return applySort(filtered, profileSort.key, profileSort.dir);
  }, [mergedProfiles, profilesFilter, searchQuery, profileSort]);

  const filteredResults = useMemo(() => {
    let filtered = testResults;
    if (resultsFilter === 'No Prefix') filtered = filtered.filter(r => isUserWithoutPrefix(r.user_id));
    else if (resultsFilter !== 'All Users') filtered = filtered.filter(r => r.user_id.startsWith(resultsFilter));
    if (searchQuery.trim()) filtered = filtered.filter(r => r.user_id.toLowerCase().includes(searchQuery.toLowerCase()));
    if (passFilter === 'pass') filtered = filtered.filter(r => r.pass_status === true);
    else if (passFilter === 'fail') filtered = filtered.filter(r => r.pass_status === false);
    return applySort(filtered, resultSort.key, resultSort.dir);
  }, [testResults, resultsFilter, searchQuery, passFilter, resultSort]);

  const profileCountsByPrefix = useMemo(() => {
    const counts: { [key: string]: number } = {};
    USER_ID_PREFIXES.forEach(prefix => {
      if (prefix === 'All Users') counts[prefix] = profiles.length;
      else if (prefix === 'No Prefix') counts[prefix] = profiles.filter(p => isUserWithoutPrefix(p.user_id)).length;
      else counts[prefix] = profiles.filter(p => p.user_id.startsWith(prefix)).length;
    });
    return counts;
  }, [profiles]);

  const resultCountsByPrefix = useMemo(() => {
    const counts: { [key: string]: number } = {};
    USER_ID_PREFIXES.forEach(prefix => {
      if (prefix === 'All Users') counts[prefix] = testResults.length;
      else if (prefix === 'No Prefix') counts[prefix] = testResults.filter(r => isUserWithoutPrefix(r.user_id)).length;
      else counts[prefix] = testResults.filter(r => r.user_id.startsWith(prefix)).length;
    });
    return counts;
  }, [testResults]);

  const handleExport = useCallback(() => {
    const timestamp = new Date().toISOString().slice(0, 10);
    if (activeTab === 'profiles') {
      exportToCsv(`profiles-${profilesFilter}-${timestamp}.csv`, filteredProfiles.map(p => ({
        user_id: p.user_id, first_name: p.first_name || '', last_name: p.last_name || '',
        email: p.email || '', country: p.country || '', created_at: p.created_at,
        has_test_result: p.has_test_result,
      })));
    } else {
      exportToCsv(`test-results-${resultsFilter}-${timestamp}.csv`, filteredResults.map(r => ({ ...r })));
    }
  }, [activeTab, filteredProfiles, filteredResults, profilesFilter, resultsFilter]);

  const toggleProfileSort = (key: string) => {
    setProfileSort(prev => ({ key, dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc' }));
    setProfilePage(1);
  };
  const toggleResultSort = (key: string) => {
    setResultSort(prev => ({ key, dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc' }));
    setResultPage(1);
  };

  const profilePageData = useMemo(() => filteredProfiles.slice((profilePage - 1) * PAGE_SIZE, profilePage * PAGE_SIZE), [filteredProfiles, profilePage]);
  const resultPageData = useMemo(() => filteredResults.slice((resultPage - 1) * PAGE_SIZE, resultPage * PAGE_SIZE), [filteredResults, resultPage]);
  const profileTotalPages = Math.max(1, Math.ceil(filteredProfiles.length / PAGE_SIZE));
  const resultTotalPages = Math.max(1, Math.ceil(filteredResults.length / PAGE_SIZE));

  const Pagination: React.FC<{ page: number; total: number; count: number; onChange: (p: number) => void }> = ({ page, total, count, onChange }) => (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700 text-sm text-gray-400">
      <span>Showing {Math.min((page - 1) * PAGE_SIZE + 1, count)}–{Math.min(page * PAGE_SIZE, count)} of {count}</span>
      <div className="flex items-center space-x-2">
        <button onClick={() => onChange(1)} disabled={page === 1} className="px-2 py-1 rounded bg-gray-700 disabled:opacity-40 hover:bg-gray-600">«</button>
        <button onClick={() => onChange(page - 1)} disabled={page === 1} className="px-2 py-1 rounded bg-gray-700 disabled:opacity-40 hover:bg-gray-600">‹</button>
        <span className="px-2">{page} / {total}</span>
        <button onClick={() => onChange(page + 1)} disabled={page === total} className="px-2 py-1 rounded bg-gray-700 disabled:opacity-40 hover:bg-gray-600">›</button>
        <button onClick={() => onChange(total)} disabled={page === total} className="px-2 py-1 rounded bg-gray-700 disabled:opacity-40 hover:bg-gray-600">»</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans flex flex-col p-4 sm:p-6 lg:p-8">
      <header className="flex justify-between items-center mb-6 pb-4 border-b border-gray-700">
        <div>
          <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-gray-400">Profiles & Test Results Overview</p>
        </div>
        <div className="flex items-center space-x-4">
          <button onClick={() => fetchData(true)} className="p-2 rounded-full hover:bg-gray-700 transition" aria-label="Refresh data">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
          </button>
          <button onClick={onSignOut} className="px-4 py-2 bg-lifewood-saffaron text-lifewood-dark-serpent font-semibold rounded-md hover:bg-lifewood-earth-yellow transition-colors">
            Sign Out
          </button>
        </div>
      </header>

      {/* Stats Cards */}
      {!loading && !error && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
          <div className="bg-gray-800 rounded-lg p-4 text-center">
            <p className="text-gray-400 text-xs uppercase tracking-wider">Total Users</p>
            <p className="text-2xl font-bold text-white mt-1">{stats.totalUsers}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 text-center">
            <p className="text-gray-400 text-xs uppercase tracking-wider">Took Exam</p>
            <p className="text-2xl font-bold text-blue-400 mt-1">{stats.withResults}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 text-center">
            <p className="text-gray-400 text-xs uppercase tracking-wider">No Exam Yet</p>
            <p className="text-2xl font-bold text-yellow-400 mt-1">{stats.withoutResults}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 text-center">
            <p className="text-gray-400 text-xs uppercase tracking-wider">Pass Rate</p>
            <p className="text-2xl font-bold text-green-400 mt-1">{stats.passRate}%</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 text-center">
            <p className="text-gray-400 text-xs uppercase tracking-wider">Typo IDs</p>
            <p className="text-2xl font-bold text-red-400 mt-1">{stats.typoCount}</p>
          </div>
        </div>
      )}

      <main className="flex-grow">
        <div className="mb-6">
          <div className="border-b border-gray-700">
            <nav className="-mb-px flex space-x-6" aria-label="Tabs">
              <button onClick={() => setActiveTab('profiles')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'profiles' ? 'border-lifewood-saffaron text-lifewood-saffaron' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'}`}>
                Profiles ({profiles.length})
              </button>
              <button onClick={() => setActiveTab('results')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'results' ? 'border-lifewood-saffaron text-lifewood-saffaron' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'}`}>
                Test Results ({testResults.length})
              </button>
            </nav>
          </div>
        </div>

        {loading ? <LoaderIcon /> : error ? (
          <div className="text-center p-8 bg-red-900 bg-opacity-30 border border-red-500 rounded-lg">
            <h3 className="text-red-400 font-semibold text-lg">An Error Occurred</h3>
            <p className="text-red-400 mt-2">{error}</p>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
            {/* Filters bar */}
            <div className="p-4 border-b border-gray-700 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center space-x-2">
                  <label className="text-gray-400 font-medium text-sm whitespace-nowrap">Filter by Prefix:</label>
                  <select
                    value={activeTab === 'profiles' ? profilesFilter : resultsFilter}
                    onChange={e => {
                      if (activeTab === 'profiles') { setProfilesFilter(e.target.value); setProfilePage(1); }
                      else { setResultsFilter(e.target.value); setResultPage(1); }
                    }}
                    className="px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-gray-200 focus:outline-none focus:ring-2 focus:ring-lifewood-saffaron"
                  >
                    {USER_ID_PREFIXES.map(id => (
                      <option key={id} value={id}>
                        {id} ({activeTab === 'profiles' ? profileCountsByPrefix[id] ?? 0 : resultCountsByPrefix[id] ?? 0})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center space-x-2">
                  <label className="text-gray-400 font-medium text-sm whitespace-nowrap">Search:</label>
                  <input
                    type="text"
                    placeholder="User ID or Name..."
                    value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); setProfilePage(1); setResultPage(1); }}
                    className="px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-gray-200 focus:outline-none focus:ring-2 focus:ring-lifewood-saffaron"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-200">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                {activeTab === 'results' && (
                  <div className="flex items-center space-x-2">
                    <label className="text-gray-400 font-medium text-sm whitespace-nowrap">Status:</label>
                    <select
                      value={passFilter}
                      onChange={e => { setPassFilter(e.target.value as any); setResultPage(1); }}
                      className="px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-gray-200 focus:outline-none focus:ring-2 focus:ring-lifewood-saffaron"
                    >
                      <option value="all">All</option>
                      <option value="pass">Pass</option>
                      <option value="fail">Fail</option>
                    </select>
                  </div>
                )}
              </div>
              <button
                onClick={handleExport}
                className="px-4 py-2 bg-lifewood-castleton-green text-lifewood-paper font-semibold rounded-md hover:bg-opacity-80 transition-colors text-sm flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Export as CSV
              </button>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              {activeTab === 'profiles' ? (
                <table key="profiles" className="min-w-full divide-y divide-gray-700">
                  <thead className="bg-gray-800">
                    <tr>
                      {[
                        { label: 'User ID', key: 'user_id' },
                        { label: 'First Name', key: 'first_name' },
                        { label: 'Last Name', key: 'last_name' },
                        { label: 'Email', key: 'email' },
                        { label: 'Country', key: 'country' },
                        { label: 'Created At', key: 'created_at' },
                        { label: 'Exam Taken', key: 'has_test_result' },
                      ].map(col => (
                        <th
                          key={col.key}
                          onClick={() => toggleProfileSort(col.key)}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-200 select-none"
                        >
                          {col.label}
                          <SortIcon active={profileSort.key === col.key} dir={profileSort.dir} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-gray-900 divide-y divide-gray-700">
                    {profilePageData.length === 0 ? (
                      <tr><td colSpan={7} className="text-center py-8 text-gray-500">No records found.</td></tr>
                    ) : profilePageData.map((p, i) => (
                      <tr key={p.user_id + i} className={`hover:bg-gray-800 transition-colors ${p.has_typo ? 'border-l-2 border-red-500' : ''}`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                          {p.has_typo
                            ? <span className="flex items-center gap-1">{p.user_id}<span className="text-xs text-red-400 font-sans" title="Possible typo in prefix">⚠ typo?</span></span>
                            : p.user_id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{p.first_name || <span className="text-gray-600">—</span>}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{p.last_name || <span className="text-gray-600">—</span>}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{p.email || <span className="text-gray-600">—</span>}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{p.country || <span className="text-gray-600">—</span>}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">{new Date(p.created_at).toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${p.has_test_result ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-400'}`}>
                            {p.has_test_result ? 'Yes' : 'No'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table key="results" className="min-w-full divide-y divide-gray-700">
                  <thead className="bg-gray-800">
                    <tr>
                      {[
                        { label: 'ID', key: 'id' },
                        { label: 'User ID', key: 'user_id' },
                        { label: 'WPM', key: 'wpm' },
                        { label: 'Accuracy', key: 'accuracy' },
                        { label: 'True Accuracy', key: 'true_accuracy' },
                        { label: 'Score', key: 'score' },
                        { label: 'Attempts', key: 'attempt_count' },
                        { label: 'Pass Status', key: 'pass_status' },
                        { label: 'Created At', key: 'created_at' },
                      ].map(col => (
                        <th
                          key={col.key}
                          onClick={() => toggleResultSort(col.key)}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-200 select-none"
                        >
                          {col.label}
                          <SortIcon active={resultSort.key === col.key} dir={resultSort.dir} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-gray-900 divide-y divide-gray-700">
                    {resultPageData.length === 0 ? (
                      <tr><td colSpan={9} className="text-center py-8 text-gray-500">No records found.</td></tr>
                    ) : resultPageData.map((r, i) => (
                      <tr key={r.id + i} className="hover:bg-gray-800 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">{r.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">{r.user_id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{r.wpm?.toFixed(1)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{r.accuracy?.toFixed(1)}%</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{r.true_accuracy?.toFixed(1)}%</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{r.score ?? '—'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{r.attempt_count ?? '—'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${r.pass_status ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                            {r.pass_status ? 'PASS' : 'FAIL'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">{new Date(r.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <Pagination
              page={activeTab === 'profiles' ? profilePage : resultPage}
              total={activeTab === 'profiles' ? profileTotalPages : resultTotalPages}
              count={activeTab === 'profiles' ? filteredProfiles.length : filteredResults.length}
              onChange={activeTab === 'profiles' ? setProfilePage : setResultPage}
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
