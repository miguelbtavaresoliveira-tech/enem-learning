import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Simulado ENEM',
    description: 'Pratique com questões reais do ENEM',
};

export default function SimuladoLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            <style>{`
                /* Apple HIG system tokens */
                :root {
                    --label: #000000;
                    --secondary-label: rgba(60,60,67,0.6);
                    --tertiary-label: rgba(60,60,67,0.3);
                    --separator: rgba(60,60,67,0.18);
                    --sys-bg: #F2F2F7;
                    --card-bg: #FFFFFF;
                    --elevated-bg: #FFFFFF;
                    --nav-bg: rgba(242,242,247,0.82);
                    --seg-bg: rgba(118,118,128,0.12);
                    --toggle-off: rgba(120,120,128,0.32);
                    --blue: #007AFF;
                    --green: #34C759;
                    --red: #FF3B30;
                    --orange: #FF9500;
                    --yellow: #FFCC00;
                }
                @media (prefers-color-scheme: dark) {
                    :root:not([data-theme="light"]) {
                        --label: #FFFFFF;
                        --secondary-label: rgba(235,235,245,0.6);
                        --tertiary-label: rgba(235,235,245,0.18);
                        --separator: rgba(84,84,88,0.6);
                        --sys-bg: #000000;
                        --card-bg: #1C1C1E;
                        --elevated-bg: #2C2C2E;
                        --nav-bg: rgba(0,0,0,0.82);
                        --seg-bg: rgba(118,118,128,0.24);
                        --toggle-off: rgba(120,120,128,0.32);
                        color-scheme: dark;
                    }
                }
                :root[data-theme="dark"] {
                    --label: #FFFFFF;
                    --secondary-label: rgba(235,235,245,0.6);
                    --tertiary-label: rgba(235,235,245,0.18);
                    --separator: rgba(84,84,88,0.6);
                    --sys-bg: #000000;
                    --card-bg: #1C1C1E;
                    --elevated-bg: #2C2C2E;
                    --nav-bg: rgba(0,0,0,0.82);
                    --seg-bg: rgba(118,118,128,0.24);
                    --toggle-off: rgba(120,120,128,0.32);
                    color-scheme: dark;
                }

                /* Override root background for simulado pages */
                body { background: var(--sys-bg) !important; }

                /* Smooth page transitions */
                * { -webkit-tap-highlight-color: transparent; }
            `}</style>
            {children}
        </>
    );
}
