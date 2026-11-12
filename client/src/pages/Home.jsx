import React from "react";
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import WhySmartVillage from "../components/WhySmartVillage";
import Features from "../components/Features";
import HowItWorks from "../components/HowItWorks";
import AccessibilitySection from "../components/AccessibilitySection";
import AnnouncementsSection from "../components/AnnouncementsSection";
import UserRolesSection from "../components/UserRolesSection";
import ImpactBenefits from "../components/ImpactBenefits";
import CallToAction from "../components/CallToAction";
import ContactSection from "../components/ContactSection";
import Footer from "../components/Footer";
import "../styles/SmartVillageLanding.css";

export default function Home() {
  return (
    <div className="smart-village-app">
      {/* 1. Sticky Navigation Bar */}
      <Navbar />

      {/* 2. Hero Section */}
      <Hero />

      {/* 3. Project Introduction & Why Smart Village (Before vs After) */}
      <WhySmartVillage />

      {/* 4. Comprehensive 9 Platform Features */}
      <Features />

      {/* 5. 4-Step Process (How It Works) */}
      <HowItWorks />

      {/* 6. Special Accessibility Section (Voice & Inclusive Tech) */}
      <AccessibilitySection />

      {/* 7. Live Real Announcements Preview */}
      <AnnouncementsSection />

      {/* 8. User Roles (Citizen, Worker, Admin Portals) */}
      <UserRolesSection />

      {/* 9. Civic Impact & Measurable Benefits */}
      <ImpactBenefits />

      {/* 10. Final Call To Action */}
      <CallToAction />

      {/* 11. Helpdesk & Emergency Helplines */}
      <ContactSection />

      {/* 12. Footer */}
      <Footer />
    </div>
  );
}
