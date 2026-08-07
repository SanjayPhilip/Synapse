import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Modal,
  Badge,
  ScoreRing,
  ProgressBar,
  EmptyState,
  Toast,
  Spinner,
  ToggleSwitch,
} from '@/components/ui';

describe('UI Components', () => {
  describe('Modal', () => {
    it('renders nothing when open is false', () => {
      render(<Modal open={false} onClose={vi.fn()} title="Test" />);
      expect(screen.queryByText('Test')).not.toBeInTheDocument();
    });

    it('renders title and children when open is true', () => {
      render(
        <Modal open={true} onClose={vi.fn()} title="Test Modal">
          <p>Modal content</p>
        </Modal>
      );
      expect(screen.getByText('Test Modal')).toBeInTheDocument();
      expect(screen.getByText('Modal content')).toBeInTheDocument();
    });

    it('calls onClose when clicking close button', () => {
      const onClose = vi.fn();
      render(
        <Modal open={true} onClose={onClose} title="Test" />
      );
      fireEvent.click(screen.getByText('×'));
      expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose when clicking backdrop', () => {
      const onClose = vi.fn();
      render(
        <Modal open={true} onClose={onClose} title="Test">
          <p>Content</p>
        </Modal>
      );
      // Click the backdrop (first child of the fixed container)
      const backdrop = screen.getByText('Content').parentElement!.parentElement!.parentElement!.firstChild;
      fireEvent.click(backdrop);
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Badge', () => {
    it('renders children', () => {
      render(<Badge>Test Badge</Badge>);
      expect(screen.getByText('Test Badge')).toBeInTheDocument();
    });

    it('renders without error', () => {
      render(<Badge>Default</Badge>);
      expect(screen.getByText('Default')).toBeInTheDocument();
    });

    it('renders with custom color prop', () => {
      render(<Badge color="green">Success</Badge>);
      expect(screen.getByText('Success')).toBeInTheDocument();
    });

    it('handles all color variants', () => {
      const colors = ['slate', 'blue', 'green', 'amber', 'red', 'teal'];
      colors.forEach(color => {
        const { unmount } = render(<Badge color={color as any}>Test</Badge>);
        expect(screen.getByText('Test')).toBeInTheDocument();
        unmount();
      });
    });
  });

  describe('ScoreRing', () => {
    it('renders score value', () => {
      render(<ScoreRing score={85} />);
      expect(screen.getByText('85')).toBeInTheDocument();
      expect(screen.getByText('/ 100')).toBeInTheDocument();
    });

    it('applies correct color for high score', () => {
      render(<ScoreRing score={85} />);
      const svg = screen.getByText('85').parentElement!.parentElement!.querySelector('svg');
      const circle = svg!.querySelector('circle:last-child');
      expect(circle).toHaveAttribute('stroke', '#22c55e');
    });

    it('applies correct color for medium score', () => {
      render(<ScoreRing score={60} />);
      const svg = screen.getByText('60').parentElement!.parentElement!.querySelector('svg');
      const circle = svg!.querySelector('circle:last-child');
      expect(circle).toHaveAttribute('stroke', '#f59e0b');
    });

    it('applies correct color for low score', () => {
      render(<ScoreRing score={30} />);
      const svg = screen.getByText('30').parentElement!.parentElement!.querySelector('svg');
      const circle = svg!.querySelector('circle:last-child');
      expect(circle).toHaveAttribute('stroke', '#f97316');
    });

    it('applies correct color for very low score', () => {
      render(<ScoreRing score={10} />);
      const svg = screen.getByText('10').parentElement!.parentElement!.querySelector('svg');
      const circle = svg!.querySelector('circle:last-child');
      expect(circle).toHaveAttribute('stroke', '#ef4444');
    });

    it('accepts custom size', () => {
      render(<ScoreRing score={50} size={80} />);
      const svg = screen.getByText('50').parentElement!.parentElement!.querySelector('svg');
      expect(svg).toHaveAttribute('width', '80');
      expect(svg).toHaveAttribute('height', '80');
    });
  });

  describe('ProgressBar', () => {
    it('renders progress bar', () => {
      render(<ProgressBar value={50} />);
      const bar = screen.getByTestId('progress-bar');
      expect(bar).toBeInTheDocument();
    });

    it('calculates percentage correctly', () => {
      render(<ProgressBar value={75} max={100} />);
      const bar = screen.getByTestId('progress-bar');
      expect(bar).toHaveAttribute('aria-valuenow', '75');
    });

    it('caps at 100%', () => {
      render(<ProgressBar value={150} max={100} />);
      const bar = screen.getByTestId('progress-bar');
      expect(bar).toHaveAttribute('aria-valuenow', '100');
    });

    it('applies custom color', () => {
      render(<ProgressBar value={50} color="green" />);
      const fill = screen.getByTestId('progress-bar').firstElementChild!;
      expect(fill).toHaveClass('bg-success-500');
    });

    it('handles zero value', () => {
      render(<ProgressBar value={0} />);
      expect(screen.getByTestId('progress-bar')).toBeInTheDocument();
    });
  });

  describe('EmptyState', () => {
    it('renders title', () => {
      render(<EmptyState title="No data" />);
      expect(screen.getByText('No data')).toBeInTheDocument();
    });

    it('renders description when provided', () => {
      render(<EmptyState title="No data" description="No results found" />);
      expect(screen.getByText('No results found')).toBeInTheDocument();
    });

    it('renders icon when provided', () => {
      render(<EmptyState title="Test" icon={<span data-testid="icon">★</span>} />);
      expect(screen.getByTestId('icon')).toBeInTheDocument();
    });

    it('renders action when provided', () => {
      render(<EmptyState title="Test" action={<button>Action</button>} />);
      expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
    });
  });

  describe('Toast', () => {
    it('renders message', () => {
      render(<Toast message="Operation successful" onClose={vi.fn()} />);
      expect(screen.getByText('Operation successful')).toBeInTheDocument();
    });

    it('applies success color by default', () => {
      render(<Toast message="Success" onClose={vi.fn()} />);
      const toast = screen.getByText('Success').parentElement!;
      expect(toast).toHaveClass('bg-success-600');
    });

    it('applies error color', () => {
      render(<Toast message="Error" type="error" onClose={vi.fn()} />);
      const toast = screen.getByText('Error').parentElement!;
      expect(toast).toHaveClass('bg-danger-600');
    });

    it('applies info color', () => {
      render(<Toast message="Info" type="info" onClose={vi.fn()} />);
      const toast = screen.getByText('Info').parentElement!;
      expect(toast).toHaveClass('bg-primary-600');
    });

    it('calls onClose when close button clicked', () => {
      const onClose = vi.fn();
      render(<Toast message="Test" onClose={onClose} />);
      fireEvent.click(screen.getByText('×'));
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Spinner', () => {
    it('renders spinner', () => {
      render(<Spinner />);
      expect(screen.getByTestId('spinner')).toBeInTheDocument();
    });

    it('accepts custom size', () => {
      render(<Spinner size={32} />);
      const spinner = screen.getByTestId('spinner');
      expect(spinner).toHaveStyle({ width: '32px', height: '32px' });
    });
  });

  describe('ToggleSwitch', () => {
    it('renders checked state', () => {
      render(<ToggleSwitch checked={true} onChange={vi.fn()} />);
      const button = screen.getByRole('switch');
      expect(button).toHaveAttribute('aria-checked', 'true');
    });

    it('renders unchecked state', () => {
      render(<ToggleSwitch checked={false} onChange={vi.fn()} />);
      const button = screen.getByRole('switch');
      expect(button).toHaveAttribute('aria-checked', 'false');
    });

    it('calls onChange when clicked', async () => {
      const onChange = vi.fn();
      render(<ToggleSwitch checked={false} onChange={onChange} />);
      await userEvent.click(screen.getByRole('switch'));
      expect(onChange).toHaveBeenCalledWith(true);
    });

    it('does not call onChange when disabled', async () => {
      const onChange = vi.fn();
      render(<ToggleSwitch checked={false} onChange={onChange} disabled />);
      await userEvent.click(screen.getByRole('switch'));
      expect(onChange).not.toHaveBeenCalled();
    });

    it('applies disabled styles', () => {
      render(<ToggleSwitch checked={false} onChange={vi.fn()} disabled />);
      const button = screen.getByRole('switch');
      expect(button).toBeDisabled();
    });
  });
});