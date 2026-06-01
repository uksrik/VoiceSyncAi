import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import App from './App';

globalThis.fetch = vi.fn();

beforeEach(() => {
  globalThis.fetch.mockResolvedValue({
    ok: false,
    json: async () => ({ error: 'TTS API 404' }),
  });
  window.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
  window.URL.revokeObjectURL = vi.fn();
  window.FileReader = vi.fn(function FileReaderMock() {
    this.readAsDataURL = () => {
      this.onload?.({ target: { result: 'data:image/png;base64,mock' } });
    };
  });
  window.Image = vi.fn(function ImageMock() {
    this.naturalWidth = 120;
    this.width = 120;
    this.height = 120;
    setTimeout(() => this.onload?.(), 0);
  });
  HTMLCanvasElement.prototype.captureStream = vi.fn(() => ({
    getTracks: vi.fn(() => [{ stop: vi.fn() }]),
  }));
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    fillRect: vi.fn(),
    save: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    stroke: vi.fn(),
    restore: vi.fn(),
    clip: vi.fn(),
    drawImage: vi.fn(),
    fillText: vi.fn(),
    roundRect: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    fill: vi.fn(),
  }));
  window.MediaRecorder = vi.fn(function MediaRecorderMock() {
    this.start = vi.fn();
    this.stop = vi.fn(() => {
      this.ondataavailable?.({ data: new Blob(['mock video'], { type: 'video/webm' }) });
      this.onstop?.();
    });
  });
  window.MediaRecorder.isTypeSupported = vi.fn(() => true);
  window.SpeechSynthesisUtterance = vi.fn(function SpeechSynthesisUtteranceMock(text) {
    this.text = text;
  });
  window.speechSynthesis = {
    cancel: vi.fn(),
    getVoices: vi.fn(() => [{ name: 'Test English Voice', lang: 'en-US' }]),
    speak: vi.fn(utterance => utterance.onend?.()),
  };
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('current script continue flow', () => {
  it('renders the voice step after writing a script and continuing', async () => {
    render(<App />);

    fireEvent.change(document.querySelector('input[type="file"]'), {
      target: { files: [new File(['mock'], 'avatar.png', { type: 'image/png' })] },
    });

    await waitFor(() => expect(screen.getByText(/Photo uploaded/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    fireEvent.change(screen.getByPlaceholderText(/Type your script here/i), {
      target: { value: 'This script is long enough to continue to the voice step.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    expect(screen.getByText(/Choose Your Voice/i)).toBeInTheDocument();
  });

  it('shows PDF/PowerPoint deck upload on the script step', async () => {
    render(<App />);

    fireEvent.change(document.querySelector('input[type="file"]'), {
      target: { files: [new File(['mock'], 'avatar.png', { type: 'image/png' })] },
    });

    await waitFor(() => expect(screen.getByText(/Photo uploaded/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    fireEvent.click(screen.getByRole('button', { name: /PDF \/ PowerPoint/i }));

    expect(screen.getByText(/Upload PDF or PPTX/i)).toBeInTheDocument();
    expect(screen.getByText(/PDF \/ PowerPoint deck/i)).toBeInTheDocument();
  });

  it('falls back to browser speech when cloud TTS preview is unavailable', async () => {
    render(<App />);

    fireEvent.change(document.querySelector('input[type="file"]'), {
      target: { files: [new File(['mock'], 'avatar.png', { type: 'image/png' })] },
    });

    await waitFor(() => expect(screen.getByText(/Photo uploaded/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    fireEvent.change(screen.getByPlaceholderText(/Type your script here/i), {
      target: { value: 'This script is long enough to preview the generated voice.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    await waitFor(() => expect(screen.getByText(/Choose Your Voice/i)).toBeInTheDocument());
    fireEvent.click(screen.getAllByRole('button', { name: /Test/i })[0]);

    await waitFor(() => expect(window.speechSynthesis.speak).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(/Voice preview failed/i)).not.toBeInTheDocument();
  });

  it('renders a fallback preview instead of flashing when cloud AI video generation fails', async () => {
    render(<App />);

    fireEvent.change(document.querySelector('input[type="file"]'), {
      target: { files: [new File(['mock'], 'avatar.png', { type: 'image/png' })] },
    });

    await waitFor(() => expect(screen.getByText(/Photo uploaded/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    fireEvent.change(screen.getByPlaceholderText(/Type your script here/i), {
      target: { value: 'This script is long enough to attempt generating a full AI video.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    await waitFor(() => expect(screen.getByText(/Choose Your Voice/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    await waitFor(() => expect(screen.getByText(/Background Music/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    await waitFor(() => expect(screen.getByText(/Review & Edit/i)).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /generate ai video/i }));

    await waitFor(() => expect(screen.getByText(/Fallback Preview is Ready/i)).toBeInTheDocument(), { timeout: 8000 });
    expect(screen.queryByText(/Your Video is Ready/i)).not.toBeInTheDocument();
  }, 10000);
});
