import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { Profile, TestResult } from '../types';

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
  'No Prefix' // Added option for no prefix
];

const LoaderIcon: React.FC = () => (
  <div className="flex justify-center items-center h-full">
    <svg className="animate-spin h-8 w-8 text-lifewood-saffaron" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  </div>
);

const exportToCsv = (filename: string, rows: object[]) => {
  if (!rows || rows.length === 0) {
    alert("No data to export for the current filter.");
    return;
  }

  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(','),
    ...rows.map(row =>
      headers.map(header => {
        let cellValue = (row as any)[header];
        if (cellValue === null || cellValue === undefined) {
          return '';
        }
        let cell = String(cellValue);
        if (cell.search(/("|,|\n)/g) >= 0) {
          cell = `"${cell.replace(/"/g, '""')}"`;
        }
        return cell;
      }).join(',')
    )
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

const AdminDashboard: React.FC<{ onSignOut: () => void }> = ({ onSignOut }) => {
  const [activeTab, setActiveTab] = useState<'profiles' | 'results'>('profiles');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [profilesFilter, setProfilesFilter] = useState('All Users');
  const [resultsFilter, setResultsFilter] = useState('All Users');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const [profilesResponse, resultsResponse] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('test_results').select('*').order('created_at', { ascending: false })
      ]);

      if (profilesResponse.error) throw profilesResponse.error;
      if (resultsResponse.error) throw resultsResponse.error;

      setProfiles(profilesResponse.data || []);
      setTestResults(resultsResponse.data || []);
    } catch (err: any) {
      console.error("Error fetching admin data:", err);
      setError(`Failed to fetch data: ${err.message}. Please check RLS policies.`);
    } finally {
      if (!isRefresh) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Function to check if the user ID has no prefixes
  const isUserWithoutPrefix = (userId: string) => {
    return !USER_ID_PREFIXES.some(prefix => prefix !== 'No Prefix' && userId.startsWith(prefix));
  };

  // Filter profiles and test results based on the selected filter
  const filteredProfiles = useMemo(() => {
    let filtered = profiles;

    // Apply prefix filter
    if (profilesFilter === 'No Prefix') {
      filtered = filtered.filter((p: Profile) => isUserWithoutPrefix(p.user_id));
    } else if (profilesFilter !== 'All Users') {
      filtered = filtered.filter((p: Profile) => p.user_id.startsWith(profilesFilter));
    }

    // Apply search filter
    if (searchQuery.trim() !== '') {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter((p: Profile) => p.user_id.toLowerCase().includes(lowerQuery));
    }

    return filtered;
  }, [profiles, profilesFilter, searchQuery]);

  const filteredResults = useMemo(() => {
    let filtered = testResults;

    // Apply prefix filter
    if (resultsFilter === 'No Prefix') {
      filtered = filtered.filter((r: TestResult) => isUserWithoutPrefix(r.user_id));
    } else if (resultsFilter !== 'All Users') {
      filtered = filtered.filter((r: TestResult) => r.user_id.startsWith(resultsFilter));
    }

    // Apply search filter
    if (searchQuery.trim() !== '') {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter((r: TestResult) => r.user_id.toLowerCase().includes(lowerQuery));
    }

    return filtered;
  }, [testResults, resultsFilter, searchQuery]);

  // Fixing the profile count for "No Prefix"
  const profileCountsByPrefix = useMemo(() => {
    const counts: { [key: string]: number } = {};
    USER_ID_PREFIXES.forEach(prefix => {
      if (prefix === 'All Users') {
        counts[prefix] = profiles.length;
      } else if (prefix === 'No Prefix') {
        counts[prefix] = profiles.filter((p: Profile) => isUserWithoutPrefix(p.user_id)).length; // Correct count for "No Prefix"
      } else {
        counts[prefix] = profiles.filter((p: Profile) => p.user_id.startsWith(prefix)).length;
      }
    });
    return counts;
  }, [profiles]);

  // Fixing the result count for "No Prefix"
  const resultCountsByPrefix = useMemo(() => {
    const counts: { [key: string]: number } = {};
    USER_ID_PREFIXES.forEach(prefix => {
      if (prefix === 'All Users') {
        counts[prefix] = testResults.length;
      } else if (prefix === 'No Prefix') {
        counts[prefix] = testResults.filter((r: TestResult) => isUserWithoutPrefix(r.user_id)).length; // Correct count for "No Prefix"
      } else {
        counts[prefix] = testResults.filter((r: TestResult) => r.user_id.startsWith(prefix)).length;
      }
    });
    return counts;
  }, [testResults]);

  const handleExport = useCallback(() => {
    const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    if (activeTab === 'profiles') {
      const filename = `profiles-${profilesFilter}-${timestamp}.csv`;
      const dataToExport = filteredProfiles.map((p: Profile) => ({ user_id: p.user_id, created_at: p.created_at }));
      exportToCsv(filename, dataToExport);
    } else { // 'results'
      const filename = `test-results-${resultsFilter}-${timestamp}.csv`;
      const dataToExport = filteredResults.map((r: TestResult) => ({ ...r }));
      exportToCsv(filename, dataToExport);
    }
  }, [activeTab, filteredProfiles, filteredResults, profilesFilter, resultsFilter]);

  const renderTable = (headers: string[], data: any[], filterValue: string, setFilter: (val: string) => void, counts: { [key: string]: number }) => (
    <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
      <div className="p-4 border-b border-gray-700 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label htmlFor="user-filter" className="text-gray-400 font-medium text-sm whitespace-nowrap">Filter by Prefix:</label>
            <select
              id="user-filter"
              value={filterValue}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilter(e.target.value)}
              className="admin-select sm:w-auto px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-gray-200 focus:outline-none focus:ring-2 focus:ring-lifewood-saffaron"
              aria-label="Filter by User ID Prefix"
            >
              {USER_ID_PREFIXES.map(id => <option key={id} value={id}>{id} ({counts[id] ?? 0})</option>)}
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <label htmlFor="user-search" className="text-gray-400 font-medium text-sm whitespace-nowrap">Search User ID:</label>
            <input
              id="user-search"
              type="text"
              placeholder="e.g. PHBYU..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              className="sm:w-auto px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-gray-200 focus:outline-none focus:ring-2 focus:ring-lifewood-saffaron"
              aria-label="Search by User ID"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-gray-400 hover:text-gray-200 focus:outline-none"
                aria-label="Clear Search"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
        <button
          onClick={handleExport}
          className="px-4 py-2 bg-lifewood-castleton-green text-lifewood-paper font-semibold rounded-md hover:bg-opacity-80 transition-colors text-sm flex items-center justify-center"
          aria-label="Export current view to CSV"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
          Export as CSV
        </button>
      </div>
      <div className="overflow-x-auto custom-scrollbar">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-800">
            <tr>
              {headers.map(header => (
                <th key={header} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {header.replace(/_/g, ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-gray-900 divide-y divide-gray-700">
            {data.length === 0 ? (
              <tr><td colSpan={headers.length} className="text-center py-8 text-gray-500">No records found for the selected filter.</td></tr>
            ) : data.map((item, index) => (
              <tr key={item.id || item.user_id + index} className="hover:bg-gray-800 transition-colors">
                {headers.map(header => {
                  const key = header.toLowerCase().replace(/ /g, '_');
                  const cellData = item[key];
                  return (
                    <td key={`${item.id}-${key}`} className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                      {key === 'created_at' ? new Date(cellData).toLocaleString() :
                        typeof cellData === 'boolean' ?
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${cellData ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                            {cellData ? 'PASS' : 'FAIL'}
                          </span>
                          : String(cellData)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
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
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" /></svg>
          </button>
          <button
            onClick={onSignOut}
            className="px-4 py-2 bg-lifewood-saffaron text-lifewood-dark-serpent font-semibold rounded-md hover:bg-lifewood-earth-yellow transition-colors"
          >
            Sign Out
          </button>
        </div>
      </header>

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
          <div>
            {activeTab === 'profiles' && renderTable(['User ID', 'Created At'], filteredProfiles.map((p: Profile) => ({ user_id: p.user_id, created_at: p.created_at })), profilesFilter, setProfilesFilter, profileCountsByPrefix)}
            {activeTab === 'results' && renderTable(['ID', 'Created At', 'User ID', 'WPM', 'Accuracy', 'True Accuracy', 'Pass Status', 'Score'], filteredResults.map((r: TestResult) => ({ ...r })), resultsFilter, setResultsFilter, resultCountsByPrefix)}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
