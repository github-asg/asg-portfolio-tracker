import React, { useState } from 'react';
import { useSession } from '../../context/SessionContext';
import './Auth.css';

const Login = () => {
  const [isSignup, setIsSignup] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const sessionContext = useSession();
  const login = sessionContext?.login;
  
  if (!login) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="alert alert-error">
            <span className="alert-icon">✕</span>
            Error: Session context not available. Please refresh the page.
          </div>
        </div>
      </div>
    );
  }

  const validateForm = () => {
    const newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (isSignup) {
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your password';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError('');
    setSuccessMessage('');

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      if (isSignup) {
        // Call create user
        const result = await window.electronAPI.createUser(
          formData.username,
          formData.password
        );

        if (result.success) {
          setSuccessMessage('Account created successfully! Please login.');
          setIsSignup(false);
          setFormData({
            username: '',
            password: '',
            confirmPassword: ''
          });
          setTimeout(() => setSuccessMessage(''), 3000);
        } else {
          setGeneralError(result.error || 'Failed to create account');
        }
      } else {
        // Call login through context
        const result = await login(formData.username, formData.password);

        if (!result.success) {
          setGeneralError(result.error || 'Login failed');
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      setGeneralError(error.message || 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignup(!isSignup);
    setFormData({
      username: '',
      password: '',
      confirmPassword: ''
    });
    setErrors({});
    setGeneralError('');
    setSuccessMessage('');
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>📈 Stock Portfolio Manager</h1>
          <p>{isSignup ? 'Create Account' : 'Welcome Back'}</p>
        </div>

        {generalError && (
          <div className="alert alert-error">
            <span className="alert-icon">✕</span>
            {generalError}
          </div>
        )}

        {successMessage && (
          <div className="alert alert-success">
            <span className="alert-icon">✓</span>
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              placeholder="Enter your username"
              disabled={isLoading}
              className={errors.username ? 'input-error' : ''}
            />
            {errors.username && (
              <span className="field-error">{errors.username}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Enter your password"
              disabled={isLoading}
              className={errors.password ? 'input-error' : ''}
            />
            {errors.password && (
              <span className="field-error">{errors.password}</span>
            )}
          </div>

          {isSignup && (
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="Confirm your password"
                disabled={isLoading}
                className={errors.confirmPassword ? 'input-error' : ''}
              />
              {errors.confirmPassword && (
                <span className="field-error">{errors.confirmPassword}</span>
              )}
            </div>
          )}

          <button
            type="submit"
            className="auth-button"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="spinner"></span>
                {isSignup ? 'Creating Account...' : 'Logging In...'}
              </>
            ) : (
              isSignup ? 'Create Account' : 'Login'
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            {isSignup ? 'Already have an account?' : "Don't have an account?"}
            <button
              type="button"
              className="toggle-button"
              onClick={toggleMode}
              disabled={isLoading}
            >
              {isSignup ? 'Login' : 'Sign Up'}
            </button>
          </p>
        </div>

        <div className="auth-info">
          <p>💡 <strong>Demo Credentials:</strong></p>
          <p>Username: <code>demo</code></p>
          <p>Password: <code>demo123</code></p>
        </div>
      </div>
    </div>
  );
};

export default Login;
