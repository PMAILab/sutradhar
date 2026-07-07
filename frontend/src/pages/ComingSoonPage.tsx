export function ComingSoonPage({ title }: { title: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 px-gutter">
      <h2 className="font-serif text-headline-md text-primary">{title}</h2>
      <p className="font-sans text-body-md text-on-surface-variant">
        This part of Sutradhar is being built in a later phase.
      </p>
    </div>
  );
}
