import { copyText, copyTextFallback, copyValue } from 'c/clipboardUtils';

describe('clipboardUtils', () => {
    let appendSpy;
    let removeSpy;
    let execCommandSpy;

    beforeEach(() => {
        appendSpy = jest.spyOn(document.body, 'appendChild');
        removeSpy = jest.spyOn(document.body, 'removeChild').mockImplementation(() => {});
        // jsdom does not implement document.execCommand - stub it before spying.
        document.execCommand = jest.fn().mockReturnValue(true);
        execCommandSpy = document.execCommand;

        // jsdom's createElement('textarea') works; stub select/setSelectionRange for older jsdom.
        const realCreate = document.createElement.bind(document);
        jest.spyOn(document, 'createElement').mockImplementation((tag) => {
            const el = realCreate(tag);
            if (tag === 'textarea') {
                el.select = jest.fn();
                el.setSelectionRange = jest.fn();
                el.focus = jest.fn();
            }
            return el;
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
        delete document.execCommand;
        try {
            delete navigator.clipboard;
        } catch (e) {
            Object.defineProperty(navigator, 'clipboard', {
                configurable: true,
                value: undefined
            });
        }
    });

    describe('copyTextFallback', () => {
        it('appends a textarea, copies, and removes it', () => {
            expect(copyTextFallback('TTN-001')).toBe(true);
            expect(appendSpy).toHaveBeenCalled();
            expect(execCommandSpy).toHaveBeenCalledWith('copy');
            expect(removeSpy).toHaveBeenCalled();
        });

        it('coerces nullish values to an empty string', () => {
            expect(copyTextFallback(null)).toBe(true);
            const textarea = appendSpy.mock.calls[0][0];
            expect(textarea.value).toBe('');
        });

        it('returns false when execCommand throws', () => {
            execCommandSpy.mockImplementation(() => {
                throw new Error('blocked');
            });
            expect(copyTextFallback('x')).toBe(false);
        });

        it('returns false when execCommand returns false', () => {
            execCommandSpy.mockReturnValue(false);
            expect(copyTextFallback('x')).toBe(false);
        });
    });

    describe('copyText', () => {
        it('uses navigator.clipboard.writeText when available', async () => {
            const writeText = jest.fn().mockResolvedValue(undefined);
            Object.defineProperty(navigator, 'clipboard', {
                configurable: true,
                value: { writeText }
            });

            await expect(copyText('001xx000003DGbY')).resolves.toBe(true);
            expect(writeText).toHaveBeenCalledWith('001xx000003DGbY');
            expect(execCommandSpy).not.toHaveBeenCalled();
        });

        it('falls back when clipboard.writeText rejects', async () => {
            Object.defineProperty(navigator, 'clipboard', {
                configurable: true,
                value: { writeText: jest.fn().mockRejectedValue(new Error('denied')) }
            });

            await expect(copyText('Case-123')).resolves.toBe(true);
            expect(execCommandSpy).toHaveBeenCalledWith('copy');
        });

        it('falls back when clipboard API is missing', async () => {
            Object.defineProperty(navigator, 'clipboard', {
                configurable: true,
                value: undefined
            });

            await expect(copyText('abc')).resolves.toBe(true);
            expect(execCommandSpy).toHaveBeenCalledWith('copy');
        });
    });

    describe('copyValue', () => {
        it('trims whitespace by default before copying', async () => {
            const writeText = jest.fn().mockResolvedValue(undefined);
            Object.defineProperty(navigator, 'clipboard', {
                configurable: true,
                value: { writeText }
            });

            await expect(copyValue('  CITNETMOD-098  ')).resolves.toBe(true);
            expect(writeText).toHaveBeenCalledWith('CITNETMOD-098');
        });

        it('returns false for blank values without calling the clipboard', async () => {
            const writeText = jest.fn();
            Object.defineProperty(navigator, 'clipboard', {
                configurable: true,
                value: { writeText }
            });

            await expect(copyValue('   ')).resolves.toBe(false);
            await expect(copyValue(null)).resolves.toBe(false);
            expect(writeText).not.toHaveBeenCalled();
            expect(execCommandSpy).not.toHaveBeenCalled();
        });

        it('preserves surrounding whitespace when trim is false', async () => {
            const writeText = jest.fn().mockResolvedValue(undefined);
            Object.defineProperty(navigator, 'clipboard', {
                configurable: true,
                value: { writeText }
            });

            await expect(copyValue('  keep  ', { trim: false })).resolves.toBe(true);
            expect(writeText).toHaveBeenCalledWith('  keep  ');
        });
    });
});
