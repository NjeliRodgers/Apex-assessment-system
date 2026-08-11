import React, { useEffect, useState } from 'react';
import { getMyCertificatesApi, ApexCertificate } from '../api/apexCatalogApi';
import { ArrowLeft, Award, LoaderCircle, Download, ShieldCheck } from 'lucide-react';

interface MyCertificatesPageProps {
  onBack: () => void;
}

export const MyCertificatesPage: React.FC<MyCertificatesPageProps> = ({ onBack }) => {
  const [certificates, setCertificates] = useState<ApexCertificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let stillMounted = true;
    getMyCertificatesApi()
      .then((data) => {
        if (stillMounted) setCertificates(data);
      })
      .catch((err: Error) => {
        if (stillMounted) setError(err.message || 'Failed to load your certificates');
      })
      .finally(() => {
        if (stillMounted) setLoading(false);
      });
    return () => {
      stillMounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-fog p-4 sm:p-8">
      <main className="mx-auto max-w-3xl space-y-5">
        <button type="button" onClick={onBack} className="flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-brand-700 cursor-pointer">
          <ArrowLeft className="h-4 w-4" />
          Back to catalog
        </button>

        <div className="bg-white rounded-lg border border-line p-6">
          <h1 className="font-display text-xl font-bold text-ink">My Certificates</h1>
          <p className="text-sm text-muted mt-1">Every certificate you've earned, downloadable and independently verifiable.</p>
        </div>

        {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

        {loading ? (
          <div className="py-16 text-center flex items-center justify-center gap-2 text-sm text-muted">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : certificates.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted">
            No certificates yet — complete an exam, course, or package to earn one.
          </div>
        ) : (
          <div className="space-y-3">
            {certificates.map((cert) => (
              <div key={cert.id} className="bg-white rounded-lg border border-line p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-600 to-brand-800 text-white flex items-center justify-center shrink-0">
                    <Award className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-display font-bold text-sm text-ink">{cert.sourceName}</p>
                    <p className="text-[11px] text-muted uppercase tracking-wide">{cert.sourceType}</p>
                    <p className="flex items-center gap-1 text-[11px] text-muted mt-1 font-mono">
                      <ShieldCheck className="h-3 w-3" />
                      {cert.verificationCode}
                    </p>
                  </div>
                </div>

                {cert.status === 'approved' && cert.pdfUrl ? (
                  <a
                    href={cert.pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-4 py-2 bg-brand-700 hover:bg-brand-800 text-white text-xs font-bold rounded-md shadow-sm shrink-0"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </a>
                ) : (
                  <span className="text-[11px] text-muted shrink-0">{cert.status === 'pending_approval' ? 'Awaiting HR Team to  approve' : 'Generating…'}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};