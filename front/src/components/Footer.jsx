import React from 'react';
import { Link } from 'react-router-dom';
import {
  Instagram,
  GraduationCap,
  ShieldCheck,
  Heart,
  Mail,
  MapPin,
} from 'lucide-react';

const Footer = ({ categories = [] }) => {
  const year = new Date().getFullYear();

  const column = [
    { title: 'Platform', links: [{ label: 'Home', to: '/' }, { label: 'My Courses', to: '/MyCourses' }, { label: 'My Profile', to: '/MyProfile' }, { label: 'Create Account', to: '/login' }] },
    { title: 'Company', links: [{ label: 'About', to: '/' }, { label: 'Instructors', to: '/' }, { label: 'Careers', to: '/' }, { label: 'Contact', to: '/' }] },
    { title: 'Support', links: [{ label: 'Help Center', to: '/' }, { label: 'Payment & Refunds', to: '/' }, { label: 'Privacy Policy', to: '/' }, { label: 'Terms of Service', to: '/' }] },
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
              A secure professional learning platform. Master in-demand skills with expert
              instructors and protected, practical course content.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <a
                href="https://instagram.com/ornyms"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="w-9 h-9 rounded-lg bg-slate-800/80 hover:bg-emerald-600 hover:text-white flex items-center justify-center transition-colors"
              >
                <Instagram size={16} />
              </a>
              <a
                href="mailto:support@lms.example.com"
                aria-label="Email"
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
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider">Categories</h4>
            <ul className="mt-4 space-y-2.5">
              {(categories.length ? categories : ['Web Development', 'Programming', 'Design', 'Data & AI']).slice(0, 4).map((cat) => (
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
            © {year} LMS. All rights reserved.
          </p>
          <div className="flex items-center gap-5 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-500" /> Secure protected content
            </span>
            <span className="inline-flex items-center gap-1.5">
              Made with <Heart size={12} className="text-emerald-500" /> for learners
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
