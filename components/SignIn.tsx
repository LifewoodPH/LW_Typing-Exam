
import React, { useState, FormEvent } from 'react';
import { supabase } from '../supabaseClient'; // Import Supabase client

interface SignInProps {
  onSignIn: (userId: string) => void;
  onAdminSignIn: () => void;
}

const USER_ID_PREFIXES = [
  'PHBYUGH',
  'PHBYUNG',
  'PHBYUZA',
  'PHBYUUG',
  'PHLG',
  'PHCB',
  'PHCBIT',
  'PHBYU',
  'PHCEC',
  'PHBYUMG',
  'PHBYUCG',
  'PHCITU',
  'PHBYUDRC',
  'PHJJ',
  'PHNX',
  'PHUCLM',
  'PHCTU',
  'PHUCMC',
  'PHLWP'
];

const SignIn: React.FC<SignInProps> = ({ onSignIn, onAdminSignIn }) => {
  // State for User Sign-In
  const [prefix, setPrefix] = useState<string>(USER_ID_PREFIXES[0]);
  const [numberPart, setNumberPart] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // State for Admin Sign-In
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [isAdminLoading, setIsAdminLoading] = useState(false);

  // View state
  const [isLoginViewAdmin, setLoginViewAdmin] = useState(false);

  const handleNumberChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    const numericValue = value.replace(/[^0-9]/g, '');
    if (numericValue.length <= 4) {
      setNumberPart(numericValue);
    }
  };

  const handleUserSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedUserId = `${prefix}${numberPart}`.trim().toUpperCase();

    if (numberPart.length < 3 || numberPart.length > 4) {
      setError('User ID number must be 3 or 4 digits.');
      return;
    }
    setError('');
    setIsLoading(true);

    try {
      const { error: dbError } = await supabase
        .from('profiles')
        .insert([{ user_id: trimmedUserId }]);

      if (dbError) {
        if (dbError.code === '23505') {
          onSignIn(trimmedUserId);
        } else {
          console.error('Error processing User ID:', dbError.message, dbError);
          setError(`Failed to process User ID: ${dbError.message}. Ensure 'profiles' table is correctly set up.`);
          setIsLoading(false);
        }
      } else {
        onSignIn(trimmedUserId);
      }
    } catch (e: any) {
      console.error('Sign-in error:', e);
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  const handleAdminSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAdminError('');
    setIsAdminLoading(true);

    if (username === 'admin' && password === '1234') {
      onAdminSignIn();
    } else {
      setAdminError('Invalid username or password.');
      setIsAdminLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-lifewood-paper text-lifewood-dark-serpent p-4 selection:bg-lifewood-saffaron selection:text-lifewood-dark-serpent font-sans">
      <div className="bg-lifewood-white p-8 sm:p-10 rounded-lg shadow-xl w-full max-w-sm border border-lifewood-dark-serpent border-opacity-10">
        <h1 className="text-3xl font-bold text-lifewood-castleton-green mb-3 text-center">
          {isLoginViewAdmin ? 'Admin Access' : 'Lifewood Typing Exam'}
        </h1>
        <p className="text-lifewood-dark-serpent opacity-80 mb-8 text-center text-sm">
          {isLoginViewAdmin ? 'Please sign in to continue.' : 'Please enter your User ID to continue.'}
        </p>

        {isLoginViewAdmin ? (
          <form onSubmit={handleAdminSubmit} noValidate>
            <div className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-lifewood-dark-serpent opacity-90 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={username}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                  className="w-full px-4 py-2.5 bg-lifewood-sea-salt border border-lifewood-dark-serpent border-opacity-20 rounded-md focus:ring-2 focus:ring-lifewood-saffaron focus:border-lifewood-saffaron placeholder-lifewood-dark-serpent placeholder-opacity-50 text-lifewood-dark-serpent"
                  placeholder=" "
                  autoFocus
                  disabled={isAdminLoading}
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-lifewood-dark-serpent opacity-90 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-lifewood-sea-salt border border-lifewood-dark-serpent border-opacity-20 rounded-md focus:ring-2 focus:ring-lifewood-saffaron focus:border-lifewood-saffaron placeholder-lifewood-dark-serpent placeholder-opacity-50 text-lifewood-dark-serpent"
                  placeholder=" "
                  disabled={isAdminLoading}
                />
              </div>
            </div>
            {adminError && (
              <p className="mt-4 text-sm text-red-600 text-center" role="alert">
                {adminError}
              </p>
            )}
            <button
              type="submit"
              className={`w-full mt-8 px-4 py-3 bg-lifewood-castleton-green text-lifewood-paper font-semibold rounded-md hover:bg-opacity-80 transition-colors focus:outline-none focus:ring-2 focus:ring-lifewood-castleton-green focus:ring-offset-2 focus:ring-offset-lifewood-white ${isAdminLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
              disabled={isAdminLoading}
            >
              {isAdminLoading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleUserSubmit} noValidate>
            <div>
              <label htmlFor="userId" className="block text-sm font-medium text-lifewood-dark-serpent opacity-90 mb-1">
                User ID
              </label>
              <div className="flex items-center">
                <select
                  id="userIdPrefix"
                  name="userIdPrefix"
                  value={prefix}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPrefix(e.target.value)}
                  className="h-full z-10 pl-4 pr-10 py-2.5 bg-lifewood-sea-salt border border-lifewood-dark-serpent border-opacity-20 rounded-l-md focus:ring-2 focus:ring-lifewood-saffaron focus:border-lifewood-saffaron text-lifewood-dark-serpent font-semibold"
                  disabled={isLoading}
                >
                  {USER_ID_PREFIXES.map((p: string) => <option key={p} value={p}>{p}</option>)}
                </select>
                <input
                  type="text"
                  id="userId"
                  name="userId"
                  value={numberPart}
                  onChange={handleNumberChange}
                  pattern="[0-9]{3,4}"
                  maxLength={4}
                  inputMode="numeric"
                  className="w-full px-4 py-2.5 bg-lifewood-sea-salt border border-l-0 border-lifewood-dark-serpent border-opacity-20 rounded-r-md focus:ring-2 focus:ring-lifewood-saffaron focus:border-lifewood-saffaron placeholder-lifewood-dark-serpent placeholder-opacity-50 text-lifewood-dark-serpent -ml-px"
                  placeholder="Enter 3 or 4 digits"
                  aria-describedby={error ? "userId-error" : undefined}
                  autoFocus
                  disabled={isLoading}
                />
              </div>
              {error && (
                <p id="userId-error" className="mt-2 text-sm text-red-600" role="alert">
                  {error}
                </p>
              )}
            </div>
            <button
              type="submit"
              className={`w-full mt-8 px-4 py-3 bg-lifewood-saffaron text-lifewood-dark-serpent font-semibold rounded-md hover:bg-lifewood-earth-yellow transition-colors focus:outline-none focus:ring-2 focus:ring-lifewood-saffaron focus:ring-offset-2 focus:ring-offset-lifewood-white ${isLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
              disabled={isLoading}
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
        )}
        <div className="text-center mt-6">
          <button
            onClick={() => setLoginViewAdmin(!isLoginViewAdmin)}
            className="text-sm text-lifewood-dark-serpent opacity-70 hover:opacity-100 transition-opacity hover:underline"
            disabled={isLoading || isAdminLoading}
          >
            {isLoginViewAdmin ? 'User Sign-in' : 'Admin Login'}
          </button>
        </div>
      </div>
      <footer className="text-center mt-12 text-sm text-lifewood-dark-serpent opacity-75">
        <p>
          Lifewood Typing Exam
        </p>
        <p className="text-xs opacity-80">
          Powered by <span className="font-semibold text-lifewood-castleton-green">@Lifewood CBIT Team</span>
        </p>
      </footer>
    </div>
  );
};

export default SignIn;
