import React from 'react';
import { render, screen } from '@testing-library/react';
import LoadingSpinner from './LoadingSpinner';

describe('LoadingSpinner Component', () => {
  test('renders with default message', () => {
    render(<LoadingSpinner />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  test('renders with custom message', () => {
    const customMessage = 'Loading portfolio data...';
    render(<LoadingSpinner message={customMessage} />);
    
    expect(screen.getByText(customMessage)).toBeInTheDocument();
  });

  test('contains spinner element', () => {
    render(<LoadingSpinner />);
    
    const spinnerElement = document.querySelector('.spinner');
    expect(spinnerElement).toBeInTheDocument();
  });

  test('has correct CSS classes', () => {
    render(<LoadingSpinner />);
    
    const loadingContainer = document.querySelector('.loading');
    expect(loadingContainer).toBeInTheDocument();
    expect(loadingContainer).toHaveClass('loading');
  });
});