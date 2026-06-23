import type { DocumentSection } from '@/constants/documentContent';

interface DocumentPanelProps {
  title: string;
  subtitle?: string;
  sections: DocumentSection[];
}

export function DocumentPanel({ title, subtitle, sections }: DocumentPanelProps) {
  return (
    <div className="w-full h-full bg-white border-l border-pink-200 flex flex-col shadow-[-10px_0_30px_rgba(244,114,182,0.06)] z-10">
      <div className="flex items-center justify-between px-5 py-3 bg-slate-50/60 border-b border-pink-100">
        <span className="text-xs font-mono font-bold tracking-wider text-pink-500">DOCUMENT</span>
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-pink-200" />
          <div className="w-2.5 h-2.5 rounded-full bg-rose-200" />
          <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-5 text-slate-700">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pink-500 mb-2">文档 / Document</p>
          <h2 className="text-2xl font-extrabold text-slate-800 leading-tight">{title}</h2>
          {subtitle && <p className="mt-2 text-sm leading-6 text-slate-500">{subtitle}</p>}
        </div>

        <div className="space-y-5">
          {sections.map((section) => (
            <section key={section.heading} className="rounded-2xl border border-pink-100 bg-pink-50/40 p-4 shadow-sm shadow-pink-100/70">
              <h3 className="text-base font-bold text-pink-600 mb-2">{section.heading}</h3>
              <p className="text-sm leading-7 text-slate-600">{section.content}</p>

              {section.formula && (
                <div className="my-3 rounded-xl border border-pink-200 bg-white/80 px-3 py-2 font-mono text-sm text-pink-700">
                  {section.formula}
                </div>
              )}

              {section.list && (
                <ul className="mt-3 space-y-2">
                  {section.list.map((item) => (
                    <li key={item} className="flex gap-2 text-sm leading-6 text-slate-600">
                      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-pink-400 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}

              {section.code && (
                <pre className="mt-3 overflow-x-auto rounded-xl border border-pink-100 bg-white p-3 text-xs leading-5 text-emerald-700 shadow-inner">
                  <code>{section.code}</code>
                </pre>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
