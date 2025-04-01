import React, { Component } from 'react';
import { Link } from 'react-router-dom';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // You can log the error to an error reporting service
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      return (
        <div className="flex min-h-screen w-full items-center justify-center bg-gray-50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
            <div className="mb-6 flex justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-12 w-12 text-red-600" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                  />
                </svg>
              </div>
            </div>
            
            <h1 className="mb-2 text-center text-2xl font-bold text-gray-800">
              Something went wrong
            </h1>
            
            <p className="mb-6 text-center text-gray-600">
              We're sorry, but there was an error loading this page.
            </p>
            
            {this.props.showErrorDetails && this.state.error && (
              <div className="mb-6 rounded-md bg-gray-100 p-4">
                <p className="mb-2 font-semibold text-gray-700">Error details:</p>
                <p className="overflow-auto text-sm text-gray-600">
                  {this.state.error.toString()}
                </p>
              </div>
            )}
            
            <div className="flex flex-col space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full rounded-md bg-indigo-600 py-2 text-white transition-colors hover:bg-indigo-700"
              >
                Try Again
              </button>
              
              <Link
                to="/"
                className="w-full rounded-md border border-gray-300 bg-white py-2 text-center text-gray-700 transition-colors hover:bg-gray-50"
              >
                Return Home
              </Link>
            </div>
          </div>
        </div>
      );
    }

    // Normally, just render children
    return this.props.children;
  }
}

export default ErrorBoundary; 