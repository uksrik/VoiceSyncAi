import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import App from './App';

globalThis.fetch = vi.fn();

beforeEach(() => {
    window.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    window.URL.revokeObjectURL = vi.fn();
    window.speechSynthesis = { speak: vi.fn(), cancel: vi.fn() };
    window.MediaRecorder = vi.fn().mockImplementation(() => ({
        start: vi.fn(),
        ondataavailable: vi.fn(),
        onerror: vi.fn(),
        state: '',
        stop: vi.fn(function () {
            if (this.onstop) this.onstop();
        }),
    }));
    window.MediaRecorder.isTypeSupported = vi.fn(() => true);

    HTMLCanvasElement.prototype.captureStream = vi.fn(() => ({}));
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
        ellipse: vi.fn(),
        fill: vi.fn(),
        roundRect: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
    }));

    window.Audio = vi.fn().mockImplementation(() => ({
        play: vi.fn().mockResolvedValue(),
        pause: vi.fn(),
    }));

    globalThis.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
            content: [
                { type: 'text', text: 'This is a mocked rewritten script!' },
                { type: 'audio', audio_data: 'bW9jayBhdWRpbx==' },
            ],
        }),
    });
});

afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
});

describe('VoiceSync AI LipSync App - Extended Test Suite', () => {
    it('prevents navigation to Step 2 without an image', async () => {
        render(<App />);

        const continueBtn = screen.getByRole('button', { name: /continue/i });

        expect(continueBtn).toHaveStyle({ opacity: '0.4', cursor: 'not-allowed' });

        fireEvent.click(continueBtn);

        expect(screen.getByText(/Upload Your Photo/i)).toBeInTheDocument();
    });

    it('requires script > 10 characters to proceed to Step 3', async () => {
        render(<App />);

        const fileInput = document.querySelector('input[type="file"]');
        const file = new File(['dummy content'], 'test.png', { type: 'image/png' });
        fireEvent.change(fileInput, { target: { files: [file] } });

        await waitFor(() => expect(screen.getByText(/Face Detection Ready/i)).toBeInTheDocument());
        fireEvent.click(screen.getByRole('button', { name: /continue/i }));

        expect(screen.getByPlaceholderText(/Type your script here/i)).toBeInTheDocument();
        const continueBtn = screen.getByRole('button', { name: /continue/i });
        expect(continueBtn).toHaveStyle({ opacity: '0.4', cursor: 'not-allowed' });

        const scriptInput = screen.getByPlaceholderText(/Type your script here/i);
        fireEvent.change(scriptInput, { target: { value: 'short' } });
        expect(continueBtn).toHaveStyle({ opacity: '0.4', cursor: 'not-allowed' });

        fireEvent.change(scriptInput, { target: { value: 'This script is now definitely long enough to proceed.' } });
        await waitFor(() => {
            expect(continueBtn).toHaveStyle({ opacity: '1', cursor: 'pointer' });
        });

        fireEvent.click(continueBtn);
        expect(screen.getByText(/Choose Your Voice/i)).toBeInTheDocument();
    });

    it('can rewrite script using AI', async () => {
        render(<App />);

        const fileInput = document.querySelector('input[type="file"]');
        fireEvent.change(fileInput, { target: { files: [new File([''], 'test.png', { type: 'image/png' })] } });
        await waitFor(() => expect(screen.getByText(/Face Detection Ready/i)).toBeInTheDocument());
        fireEvent.click(screen.getByRole('button', { name: /continue/i }));

        const scriptInput = screen.getByPlaceholderText(/Type your script here/i);
        fireEvent.change(scriptInput, { target: { value: 'Hello world.' } });

        fireEvent.click(screen.getByText('Happy'));

        const rewriteBtn = screen.getByText(/Rewrite Script as Happy/i);
        await act(async () => {
            fireEvent.click(rewriteBtn);
        });

        await waitFor(() => {
            expect(scriptInput).toHaveValue('This is a mocked rewritten script!');
        });

        expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    it('completes the full video generation flow', async () => {
        render(<App />);

        const fileInput = document.querySelector('input[type="file"]');
        fireEvent.change(fileInput, { target: { files: [new File([''], 'a.png', { type: 'image/png' })] } });
        await waitFor(() => expect(screen.getByText(/Face Detection Ready/i)).toBeInTheDocument());
        fireEvent.click(screen.getByRole('button', { name: /continue/i }));

        fireEvent.change(screen.getByPlaceholderText(/Type your script here/i), { target: { value: 'This is a valid script.' } });
        fireEvent.click(screen.getByRole('button', { name: /continue/i }));

        await waitFor(() => expect(screen.getByText(/Choose Your Voice/i)).toBeInTheDocument());
        fireEvent.click(screen.getByRole('button', { name: /continue/i }));

        await waitFor(() => expect(screen.getByText(/Background Music/i)).toBeInTheDocument());
        fireEvent.click(screen.getByText('Cinematic'));
        fireEvent.click(screen.getByRole('button', { name: /continue/i }));

        await waitFor(() => expect(screen.getByText(/Review & Edit/i)).toBeInTheDocument());

        vi.useFakeTimers();
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /generate ai video/i }));
            await vi.advanceTimersByTimeAsync(15000);
        });
        vi.useRealTimers();

        expect(screen.getByText(/Your Video is Ready!/i)).toBeInTheDocument();
        expect(screen.getByText('Download Video')).toBeInTheDocument();
    }, 15000);
});
