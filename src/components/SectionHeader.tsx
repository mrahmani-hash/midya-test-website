type SectionHeaderProps = {
  number: string;
  eyebrow: string;
  title: string;
  description?: string;
};

export function SectionHeader({
  number,
  eyebrow,
  title,
  description,
}: SectionHeaderProps) {
  return (
    <header className="section-header">
      <div className="section-header__index" aria-hidden="true">
        <span>{number}</span>
        <i />
      </div>
      <div>
        <p className="section-header__eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        {description ? <p className="section-header__description">{description}</p> : null}
      </div>
    </header>
  );
}
