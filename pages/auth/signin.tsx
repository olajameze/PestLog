import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/router';
import Navbar from '../../components/navbar';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import FormInput from '../../components/ui/FormInput';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setError(error.message);
    } else {
      router.push('/dashboard');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-offwhite flex items-center justify-center px-4 py-12">
      <Navbar />
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold text-navy">
            Sign in to PestLog
          </h2>
        </div>
        <Card>
          <form className="mt-8 space-y-6" onSubmit={handleSignIn}>
            <FormInput
              label="Email Address"
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
            <FormInput
              label="Password"
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
            {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">{error}</div>}
            <Button type="submit" fullWidth disabled={loading} size="lg">
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
            <div className="text-center">
              <Link href="/auth/signup" className="text-primary-600 hover:text-primary-700 font-medium">
                Need an account? Sign up
              </Link>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

