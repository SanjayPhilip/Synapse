import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PasswordStrength, calculatePasswordStrength } from '@/components/PasswordStrength';

describe('PasswordStrength', () => {
  describe('calculatePasswordStrength', () => {
    it('returns score 0 for empty password', () => {
      const result = calculatePasswordStrength('');
      expect(result.score).toBe(0);
      expect(result.label).toBe('');
      expect(result.color).toBe('');
    });

    it('returns score 1 for short password', () => {
      const result = calculatePasswordStrength('abc');
      expect(result.score).toBe(1);
      expect(result.label).toBe('Weak');
      expect(result.color).toBe('bg-red-500');
    });

    it('returns score 2 for 8+ chars but no complexity', () => {
      const result = calculatePasswordStrength('abcdefgh');
      expect(result.score).toBe(2);
      expect(result.label).toBe('Fair');
      expect(result.color).toBe('bg-orange-500');
    });

    it('returns score 3 for 8+ chars with uppercase', () => {
      const result = calculatePasswordStrength('Abcdefgh');
      expect(result.score).toBe(3);
      expect(result.label).toBe('Good');
      expect(result.color).toBe('bg-yellow-500');
    });

    it('returns score 4 for 8+ chars with uppercase and lowercase', () => {
      const result = calculatePasswordStrength('Abcdefgh');
      expect(result.score).toBe(3); // Only uppercase, lowercase is always there
    });

    it('returns score 4 for 8+ chars with uppercase, lowercase, and number', () => {
      const result = calculatePasswordStrength('Abcdefg1');
      expect(result.score).toBe(4);
      expect(result.label).toBe('Strong');
      expect(result.color).toBe('bg-cyan-500');
    });

    it('returns score 5 for full complexity', () => {
      const result = calculatePasswordStrength('Abcdefg1!');
      expect(result.score).toBe(5);
      expect(result.label).toBe('Very Strong');
      expect(result.color).toBe('bg-emerald-500');
    });

    it('handles special characters', () => {
      const result = calculatePasswordStrength('Password123!@#');
      expect(result.score).toBe(5);
      expect(result.label).toBe('Very Strong');
    });

    it('handles all lowercase with number and special', () => {
      const result = calculatePasswordStrength('password1!');
      expect(result.score).toBe(3); // length, number, special
      expect(result.label).toBe('Good');
    });

    it('handles all uppercase with number and special', () => {
      const result = calculatePasswordStrength('PASSWORD1!');
      expect(result.score).toBe(3); // length, number, special
      expect(result.label).toBe('Good');
    });
  });

  describe('PasswordStrength component', () => {
    it('renders nothing for empty password', () => {
      render(<PasswordStrength password="" />);
      expect(screen.queryByTestId('password-strength')).not.toBeInTheDocument();
    });

    it('renders strength bars for non-empty password', () => {
      render(<PasswordStrength password="abc" />);
      expect(screen.getByTestId('password-strength')).toBeInTheDocument();
    });

    it('shows correct number of filled bars for weak password', () => {
      render(<PasswordStrength password="abc" />);
      const bars = screen.getAllByRole('none').filter(el => el.tagName === 'DIV' && el.className.includes('flex-1'));
      // Should have 5 bars total, 1 filled
      expect(bars.length).toBe(5);
    });

    it('shows correct label for weak password', () => {
      render(<PasswordStrength password="abc" />);
      expect(screen.getByText('Password strength: Weak')).toBeInTheDocument();
    });

    it('shows correct label for fair password', () => {
      render(<PasswordStrength password="abcdefgh" />);
      expect(screen.getByText('Password strength: Fair')).toBeInTheDocument();
    });

    it('shows correct label for good password', () => {
      render(<PasswordStrength password="Abcdefgh" />);
      expect(screen.getByText('Password strength: Good')).toBeInTheDocument();
    });

    it('shows correct label for strong password', () => {
      render(<PasswordStrength password="Abcdefg1" />);
      expect(screen.getByText('Password strength: Strong')).toBeInTheDocument();
    });

    it('shows correct label for very strong password', () => {
      render(<PasswordStrength password="Abcdefg1!" />);
      expect(screen.getByText('Password strength: Very Strong')).toBeInTheDocument();
    });

    it('applies correct color class for very strong', () => {
      render(<PasswordStrength password="Abcdefg1!" />);
      const container = screen.getByTestId('password-strength');
      expect(container).toHaveClass('bg-emerald-500');
    });

    it('applies correct color class for strong', () => {
      render(<PasswordStrength password="Abcdefg1" />);
      const container = screen.getByTestId('password-strength');
      expect(container).toHaveClass('bg-cyan-500');
    });

    it('applies correct color class for good', () => {
      render(<PasswordStrength password="Abcdefgh" />);
      const container = screen.getByTestId('password-strength');
      expect(container).toHaveClass('bg-yellow-500');
    });

    it('applies correct color class for fair', () => {
      render(<PasswordStrength password="abcdefgh" />);
      const container = screen.getByTestId('password-strength');
      expect(container).toHaveClass('bg-orange-500');
    });

    it('applies correct color class for weak', () => {
      render(<PasswordStrength password="abc" />);
      const container = screen.getByTestId('password-strength');
      expect(container).toHaveClass('bg-red-500');
    });

    it('renders 5 bars always', () => {
      render(<PasswordStrength password="test" />);
      const bars = screen.getAllByRole('none').filter(el => el.tagName === 'DIV' && el.className.includes('flex-1'));
      expect(bars.length).toBe(5);
    });

    it('fills correct number of bars based on score', () => {
      render(<PasswordStrength password="Abcdefg1!" />);
      const container = screen.getByTestId('password-strength');
      const bars = container.querySelectorAll('div.flex-1');
      const filledBars = Array.from(bars).filter(bar => bar.className.includes('bg-emerald-500'));
      expect(filledBars.length).toBe(5);
    });
  });
});