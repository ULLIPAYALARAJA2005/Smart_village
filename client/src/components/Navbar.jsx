import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { ttsService } from "../services/ttsService";
import '../styles/Navbar.css';

export default function Navbar() {
  const { lang, toggleLang, t } = useLanguage();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleListenIntro = () => {
    if (isSpeaking) {
      ttsService.stop();
      setIsSpeaking(false);
      return;
    }
    const speechText = t('heroIntroSpeech');
    setIsSpeaking(true);
    ttsService.speak({
      text: speechText,
      language: lang === 'te' ? 'te-IN' : 'en-IN',
      onEnd: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  };

  const scrollToSection = (id) => {
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <header className={`navbar ${isScrolled ? 'scrolled' : ''}`}> 
      <div className="navbar-content">
        {/* Brand */}
        <div className="navbar-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <span className="logo-icon">🏛️</span>
          <span className="logo-text">
            <strong>SMART VILLAGE</strong>
            <small className="tagline">{t('brandTagline')}</small>
          </span>
        </div>

        {/* Links */}
        <ul className={`navbar-links ${mobileMenuOpen ? 'active' : ''}`}>
          <li><a href="#hero" className="nav-link" onClick={e => { e.preventDefault(); scrollToSection('hero'); }}>{t('navHome')}</a></li>
          <li><a href="#why-smart-village" className="nav-link" onClick={e => { e.preventDefault(); scrollToSection('why-smart-village'); }}>{t('navAbout')}</a></li>
          <li><a href="#features" className="nav-link" onClick={e => { e.preventDefault(); scrollToSection('features'); }}>{t('navFeatures')}</a></li>
          <li><a href="#how-it-works" className="nav-link" onClick={e => { e.preventDefault(); scrollToSection('how-it-works'); }}>{t('navHowItWorks')}</a></li>
          <li><a href="#announcements" className="nav-link" onClick={e => { e.preventDefault(); scrollToSection('announcements'); }}>{t('navAnnouncements')}</a></li>
          <li><a href="#roles" className="nav-link" onClick={e => { e.preventDefault(); scrollToSection('roles'); }}>{t('navRoles')}</a></li>
          <li><a href="#contact" className="nav-link" onClick={e => { e.preventDefault(); scrollToSection('contact'); }}>{t('navContact')}</a></li>

          {/* Mobile only actions */}
          {mobileMenuOpen && (
            <li style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
              <button className="btn-lang" onClick={() => { toggleLang(); setMobileMenuOpen(false); }}>{`🌐 ${t('langToggleName')}`}</button>
              <button className={`btn-listen ${isSpeaking ? 'speaking' : ''}`} onClick={handleListenIntro}>
                {isSpeaking ? `⏹️ ${t('heroStopAudioBtn')}` : `🔊 ${t('navListen')}`}
              </button>
              <Link to="/login" className="btn-secondary">{t('navLogin')}</Link>
              <Link to="/signup" className="btn-primary">{t('navGetStarted')}</Link>
            </li>
          )}
        </ul>

        {/* Action buttons */}
        <div className="navbar-actions">
          <button className="btn-lang" onClick={toggleLang} title={lang === 'en' ? 'తెలుగులోకి మార్చండి' : 'Switch to English'}>
            🌐 <strong>{t('langToggleName')}</strong>
          </button>
          <button className={`btn-listen ${isSpeaking ? 'speaking' : ''}`} onClick={handleListenIntro} title={isSpeaking ? t('heroStopAudioBtn') : t('heroListenBtn')}>
            {isSpeaking ? `⏹️ ${t('heroStopAudioBtn')}` : `🔊 ${t('navListen')}`}
          </button>
          <Link to="/login" className="btn-login">{t('navLogin')}</Link>
          <Link to="/signup" className="btn-primary">{t('navGetStarted')}</Link>
          <button className="hamburger" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Toggle navigation menu">
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>
    </header>
  );
}
