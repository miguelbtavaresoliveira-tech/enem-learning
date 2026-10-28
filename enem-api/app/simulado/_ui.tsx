'use client';

import React from 'react';

/* ── Apple-system color tokens (via CSS vars defined in each page's <style> or inline) ── */

export function AppleNav({
    title,
    left,
    right,
    border = true,
}: {
    title?: React.ReactNode;
    left?: React.ReactNode;
    right?: React.ReactNode;
    border?: boolean;
}) {
    return (
        <header
            className="sticky top-0 z-50 flex h-[52px] items-center justify-between px-4"
            style={{
                background: 'var(--nav-bg)',
                backdropFilter: 'blur(20px) saturate(180%)',
                WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                borderBottom: border
                    ? '0.5px solid var(--separator)'
                    : 'none',
            }}
        >
            <div className="w-24 flex items-center">{left}</div>
            <div
                className="text-[17px] font-semibold"
                style={{ color: 'var(--label)' }}
            >
                {title}
            </div>
            <div className="w-24 flex items-center justify-end">{right}</div>
        </header>
    );
}

export function NavBackBtn({
    label = 'Voltar',
    href,
    onClick,
}: {
    label?: string;
    href?: string;
    onClick?: () => void;
}) {
    const cls =
        'flex items-center gap-0.5 text-[17px] font-normal leading-none';
    const inner = (
        <>
            <svg
                width="11"
                height="18"
                viewBox="0 0 11 18"
                fill="none"
                style={{ color: 'var(--blue)' }}
            >
                <path
                    d="M9.5 1.5L2 9L9.5 16.5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
            <span style={{ color: 'var(--blue)' }}>{label}</span>
        </>
    );
    if (href)
        return (
            <a href={href} className={cls}>
                {inner}
            </a>
        );
    return (
        <button type="button" onClick={onClick} className={cls}>
            {inner}
        </button>
    );
}

export function NavTextBtn({
    label,
    onClick,
    href,
    bold = false,
}: {
    label: string;
    onClick?: () => void;
    href?: string;
    bold?: boolean;
}) {
    const cls = `text-[17px] ${bold ? 'font-semibold' : 'font-normal'}`;
    if (href)
        return (
            <a href={href} className={cls} style={{ color: 'var(--blue)' }}>
                {label}
            </a>
        );
    return (
        <button
            type="button"
            onClick={onClick}
            className={cls}
            style={{ color: 'var(--blue)' }}
        >
            {label}
        </button>
    );
}

export function GroupSection({
    header,
    footer,
    children,
}: {
    header?: string;
    footer?: string;
    children: React.ReactNode;
}) {
    return (
        <div>
            {header && (
                <p
                    className="px-4 pb-2 pt-6 text-[13px] uppercase tracking-wide"
                    style={{ color: 'var(--secondary-label)' }}
                >
                    {header}
                </p>
            )}
            <div
                className="overflow-hidden rounded-xl"
                style={{ background: 'var(--card-bg)' }}
            >
                {children}
            </div>
            {footer && (
                <p
                    className="px-4 pt-2 text-[13px] leading-relaxed"
                    style={{ color: 'var(--secondary-label)' }}
                >
                    {footer}
                </p>
            )}
        </div>
    );
}

export function GroupRow({
    label,
    sublabel,
    right,
    separator = true,
    onClick,
    chevron = false,
}: {
    label: React.ReactNode;
    sublabel?: React.ReactNode;
    right?: React.ReactNode;
    separator?: boolean;
    onClick?: () => void;
    chevron?: boolean;
}) {
    const inner = (
        <div
            className="flex min-h-[44px] items-center gap-3 px-4"
            style={
                separator
                    ? {
                          borderBottom: '0.5px solid var(--separator)',
                          marginLeft: 0,
                      }
                    : {}
            }
        >
            <div className="flex flex-1 flex-col justify-center py-2.5">
                <span
                    className="text-[17px] leading-snug"
                    style={{ color: 'var(--label)' }}
                >
                    {label}
                </span>
                {sublabel && (
                    <span
                        className="text-[13px] leading-tight mt-0.5"
                        style={{ color: 'var(--secondary-label)' }}
                    >
                        {sublabel}
                    </span>
                )}
            </div>
            {right && (
                <div
                    className="shrink-0 text-[17px]"
                    style={{ color: 'var(--secondary-label)' }}
                >
                    {right}
                </div>
            )}
            {chevron && (
                <svg
                    width="8"
                    height="13"
                    viewBox="0 0 8 13"
                    fill="none"
                    className="shrink-0"
                >
                    <path
                        d="M1.5 1.5L6.5 6.5L1.5 11.5"
                        stroke="var(--tertiary-label)"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            )}
        </div>
    );

    if (onClick)
        return (
            <button
                type="button"
                onClick={onClick}
                className="w-full text-left active:opacity-60 transition-opacity"
            >
                {inner}
            </button>
        );
    return <div>{inner}</div>;
}

export function AppleToggle({
    checked,
    onChange,
}: {
    checked: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className="relative inline-flex h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200"
            style={{
                background: checked ? 'var(--blue)' : 'var(--toggle-off)',
            }}
        >
            <span
                className="absolute top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.3)] transition-transform duration-200"
                style={{
                    transform: checked
                        ? 'translateX(22px)'
                        : 'translateX(2px)',
                }}
            />
        </button>
    );
}

export function SegmentedControl<T extends string>({
    options,
    value,
    onChange,
}: {
    options: { value: T; label: string }[];
    value: T;
    onChange: (v: T) => void;
}) {
    return (
        <div
            className="flex rounded-lg p-[2px]"
            style={{ background: 'var(--seg-bg)' }}
        >
            {options.map(opt => (
                <button
                    key={opt.value}
                    type="button"
                    onClick={() => onChange(opt.value)}
                    className="flex-1 rounded-[7px] px-3 py-[5px] text-[13px] font-medium leading-none transition-all duration-150"
                    style={
                        value === opt.value
                            ? {
                                  background: 'var(--card-bg)',
                                  color: 'var(--label)',
                                  boxShadow:
                                      '0 1px 3px rgba(0,0,0,0.12), 0 0.5px 1px rgba(0,0,0,0.08)',
                              }
                            : { color: 'var(--secondary-label)' }
                    }
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );
}

export function AppleBtn({
    children,
    onClick,
    variant = 'primary',
    disabled = false,
    fullWidth = false,
}: {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: 'primary' | 'ghost' | 'danger';
    disabled?: boolean;
    fullWidth?: boolean;
}) {
    const colors = {
        primary: {
            background: 'var(--blue)',
            color: '#fff',
        },
        ghost: {
            background: 'var(--card-bg)',
            color: 'var(--blue)',
            border: '0.5px solid var(--separator)',
        },
        danger: {
            background: 'transparent',
            color: 'var(--red)',
        },
    };

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`flex items-center justify-center rounded-xl px-6 py-3.5 text-[17px] font-semibold transition-opacity active:opacity-60 ${
                fullWidth ? 'w-full' : ''
            } disabled:opacity-40`}
            style={colors[variant]}
        >
            {children}
        </button>
    );
}

export function YearChip({
    year,
    selected,
    onToggle,
}: {
    year: number;
    selected: boolean;
    onToggle: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onToggle}
            className="rounded-lg px-3 py-1.5 text-[15px] font-medium transition-all duration-150 active:scale-95"
            style={
                selected
                    ? {
                          background: 'var(--blue)',
                          color: '#fff',
                      }
                    : {
                          background: 'var(--seg-bg)',
                          color: 'var(--label)',
                      }
            }
        >
            {year}
        </button>
    );
}

export function ScoreRing({
    score,
    size = 120,
    strokeWidth = 10,
}: {
    score: number;
    size?: number;
    strokeWidth?: number;
}) {
    const r = (size - strokeWidth) / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ * (1 - score / 100);
    const color =
        score >= 70 ? 'var(--green)' : score >= 50 ? 'var(--orange)' : 'var(--red)';

    return (
        <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
            <svg
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                style={{ transform: 'rotate(-90deg)' }}
            >
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    fill="none"
                    stroke="var(--seg-bg)"
                    strokeWidth={strokeWidth}
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    fill="none"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circ}
                    strokeDashoffset={offset}
                    style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                />
            </svg>
            <div className="absolute flex flex-col items-center leading-none">
                <span
                    className="text-[28px] font-bold tabular-nums"
                    style={{ color }}
                >
                    {score}%
                </span>
            </div>
        </div>
    );
}
