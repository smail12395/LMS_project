import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Instagram,
  GraduationCap,
  ShieldCheck,
  Heart,
  Mail,
  MapPin,
} from 'lucide-react';

const Footer = ({ categories = [] }) => {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  const column = [
    { title: t('footer.platform'), links: [{ label: t('footer.home'), to: '/' }, { label: t('footer.myCourses'), to: '/MyCourses' }, { label: t('footer.myProfile'), to: '/MyProfile' }, { label: t('footer.createAccount'), to: '/login' }] },
    { title: t('footer.company'), links: [{ label: t('footer.about'), to: '/' }, { label: t('footer.instructors'), to: '/' }, { label: t('footer.careers'), to: '/' }, { label: t('footer.contact'), to: '/' }] },
    { title: t('footer.support'), links: [{ label: t('footer.helpCenter'), to: '/' }, { label: t('footer.paymentRefunds'), to: '/' }, { label: t('footer.privacyPolicy'), to: '/' }, { label: t('footer.terms'), to: '/' }] },
  ];

  return (
    <footer className="bg-slate-950 text-slate-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-10">
          {/* Brand */}
          <div className="col-span-2">
            <Link to="/" className="text-2xl font-extrabold tracking-tight text-white">
              LMS<span className="text-emerald-400">.</span>
            </Link>
            <p className="mt-4 text-sm text-slate-400 leading-relaxed max-w-xs">
              {t('footer.tagline')}
            </p>
            <div className="mt-6 flex items-center gap-3">
              <a
                href="https://instagram.com/ornyms"
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t('footer.instagram')}
                className="w-9 h-9 rounded-lg bg-slate-800/80 hover:bg-emerald-600 hover:text-white flex items-center justify-center transition-colors"
              >
                <Instagram size={16} />
              </a>
              <a
                href="mailto:support@lms.example.com"
                aria-label={t('footer.email')}
                className="w-9 h-9 rounded-lg bg-slate-800/80 hover:bg-emerald-600 hover:text-white flex items-center justify-center transition-colors"
              >
                <Mail size={16} />
              </a>
            </div>
          </div>

          {column.map((group) => (
            <div key={group.title}>
              <h4 className="text-sm font-semibold text-white uppercase tracking-wider">{group.title}</h4>
              <ul className="mt-4 space-y-2.5">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link to={link.to} className="text-sm text-slate-400 hover:text-emerald-400 transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Categories */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider">{t('footer.categories')}</h4>
            <ul className="mt-4 space-y-2.5">
              {(categories.length
                ? categories
                : [t('footer.catWeb'), t('footer.catProgramming'), t('footer.catDesign'), t('footer.catData')]
              ).slice(0, 4).map((cat) => (
                <li key={cat}>
                  <Link to="/" className="text-sm text-slate-400 hover:text-emerald-400 transition-colors">
                    {cat}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500">
            {t('footer.rightsReserved', { year })}
          </p>
          <div className="flex items-center gap-5 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-500" /> {t('footer.secureContent')}
            </span>
            <span className="inline-flex items-center gap-1.5">
              {t('footer.madeWith')} <Heart size={12} className="text-emerald-500" />
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
