import React, { useMemo, useState } from 'react';
import { X, Printer, Copy, Check, Smartphone, ShieldCheck, QrCode } from 'lucide-react';
import { generateQRMatrix } from '../utils/qr';
import { showToast } from '../utils/toast';

interface MobileInstallQRModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const DEFAULT_MOBILE_URL =
    typeof window !== 'undefined' && window.location.hostname.includes('msappproxy.net')
        ? `${window.location.origin}/pontaj/?mode=mobile`
        : 'https://pontaj-bioeel.msappproxy.net/pontaj/?mode=mobile';

const MobileInstallQRModal: React.FC<MobileInstallQRModalProps> = ({ isOpen, onClose }) => {
    const [mobileUrl, setMobileUrl] = useState<string>(() => {
        if (typeof window === 'undefined') return DEFAULT_MOBILE_URL;
        return localStorage.getItem('pontaj_mobile_qr_url') || DEFAULT_MOBILE_URL;
    });
    const [copied, setCopied] = useState(false);

    const matrix = useMemo(() => generateQRMatrix(mobileUrl.trim() || DEFAULT_MOBILE_URL), [mobileUrl]);
    const size = matrix.length;
    const margin = 4;
    const viewBoxSize = size + margin * 2;

    if (!isOpen) return null;

    const handleUrlChange = (val: string) => {
        setMobileUrl(val);
        try {
            localStorage.setItem('pontaj_mobile_qr_url', val);
        } catch {
            // ignore storage errors
        }
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(mobileUrl);
            setCopied(true);
            showToast('Linkul aplicației mobile a fost copiat!', 'success');
            setTimeout(() => setCopied(false), 2000);
        } catch {
            showToast('Nu s-a putut copia linkul.', 'error');
        }
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                {/* Modal Top Bar (hidden on print) */}
                <div className="bg-emerald-600 dark:bg-emerald-700 px-5 py-4 flex items-center justify-between text-white print:hidden">
                    <div className="flex items-center gap-2.5">
                        <QrCode size={22} />
                        <div>
                            <h3 className="font-bold text-base leading-tight">Afiș & Cod QR – Aplicație Android Pontaj</h3>
                            <p className="text-[11px] text-emerald-100">Scanați cu camera telefonului pentru instalare și înrolare 2FA</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="hover:bg-white/20 p-1.5 rounded-lg transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Printable Poster Body */}
                <div className="p-6 space-y-5">
                    <div className="text-center">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800 mb-2">
                            <Smartphone size={14} /> Bioeel Smart Pontaj • Android & iOS
                        </div>
                        <h2 className="text-xl font-black text-slate-800 dark:text-white">
                            Instalare Aplicație Pontaj pe Telefon
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            1 Angajat = 1 Telefon Personal Înrolat (Verificare în 2 Pași)
                        </p>
                    </div>

                    {/* SVG QR Code */}
                    <div className="flex justify-center">
                        <div className="p-3 bg-white rounded-2xl border-2 border-emerald-500 shadow-md">
                            <svg
                                viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
                                className="w-52 h-52 block"
                                shapeRendering="crispEdges"
                            >
                                <rect width={viewBoxSize} height={viewBoxSize} fill="#ffffff" />
                                {matrix.map((row, r) =>
                                    row.map((cell, c) =>
                                        cell ? (
                                            <rect
                                                key={`${r}-${c}`}
                                                x={c + margin}
                                                y={r + margin}
                                                width={1}
                                                height={1}
                                                fill="#0f172a"
                                            />
                                        ) : null
                                    )
                                )}
                            </svg>
                        </div>
                    </div>

                    {/* Editable URL (hidden on print, shown as clean text on print) */}
                    <div className="print:hidden">
                        <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                            Adresă Externă Aplicație Mobilă (Entra App Proxy)
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="url"
                                value={mobileUrl}
                                onChange={(e) => handleUrlChange(e.target.value)}
                                className="flex-1 px-3 py-2 text-xs font-mono border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                            <button
                                type="button"
                                onClick={handleCopy}
                                className="px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-gray-200 dark:border-gray-700 transition-colors"
                            >
                                {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                                {copied ? 'Copiat' : 'Copiază'}
                            </button>
                        </div>
                    </div>

                    {/* 3-Step Employee Instructions */}
                    <div className="bg-slate-50 dark:bg-gray-800/60 rounded-xl p-4 border border-slate-200 dark:border-gray-700 space-y-2.5 text-xs">
                        <div className="flex items-start gap-2.5">
                            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
                            <p className="text-slate-700 dark:text-gray-300">
                                <strong>Scanați codul QR</strong> cu camera telefonului și apăsați butonul <strong>„Instalează”</strong> din partea de sus a ecranului.
                            </p>
                        </div>
                        <div className="flex items-start gap-2.5">
                            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
                            <p className="text-slate-700 dark:text-gray-300">
                                Introduceți <strong>adresa de email + PIN-ul personal</strong>, apoi <strong>codul 2FA din 6 cifre</strong> (primit pe email sau de la șeful de secție / HR).
                            </p>
                        </div>
                        <div className="flex items-start gap-2.5">
                            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">3</span>
                            <p className="text-slate-700 dark:text-gray-300">
                                <strong>Gata!</strong> Telefonul rămâne asociat contului dumneavoastră. Zilnic introduceți <strong>doar PIN-ul de 4 cifre</strong> și apăsați <strong>Start / Stop Pontaj</strong>.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800 print:hidden">
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                            <ShieldCheck size={14} /> Protejat cu 2FA & GPS
                        </span>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                            >
                                Închide
                            </button>
                            <button
                                type="button"
                                onClick={handlePrint}
                                className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
                            >
                                <Printer size={14} /> Printează Afiș
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MobileInstallQRModal;
