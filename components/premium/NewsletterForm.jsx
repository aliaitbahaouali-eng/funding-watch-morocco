'use client';
import { useState } from 'react';

export default function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  function onSubmit(e) {
    e.preventDefault();
    // TODO: brancher sur Brevo / API interne plus tard
    setSent(true);
    setTimeout(() => setSent(false), 4000);
    setEmail('');
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="votre@email.org"
        className="flex-1 rounded-full bg-white/10 px-5 py-3.5 text-sm font-medium text-white placeholder:text-white/40 focus:bg-white/15 focus:outline-none focus:ring-2 focus:ring-brand-400"
      />
      <button type="submit" className="btn-primary text-2xs uppercase tracking-widest">
        {sent ? '✓ Inscrit' : "S'inscrire"}
      </button>
    </form>
  );
}
