import React, { createContext, useState, useEffect, useContext } from 'react';

export const translations = {
  en: {
    // Brand & Nav
    brandName: "SMART VILLAGE",
    brandTagline: "Digital Village Management Platform",
    navHome: "Home",
    navAbout: "About",
    navFeatures: "Features",
    navHowItWorks: "How It Works",
    navAnnouncements: "Announcements",
    navRoles: "Roles",
    navContact: "Contact",
    navListen: "Listen",
    navLogin: "Login",
    navGetStarted: "Get Started",
    langName: "English",
    langToggleName: "తెలుగు",

    // Hero
    heroTitle: "SMART VILLAGE",
    heroSubtitle: "Connecting Villagers, Empowering Communities, Building a Better Tomorrow.",
    heroDescription: "One digital platform for reporting village problems, receiving important announcements, tracking public services and connecting villagers with Panchayat administrators.",
    heroExploreBtn: "Explore Our Services",
    heroGetStartedBtn: "Get Started",
    heroListenBtn: "Listen to Introduction",
    heroStopAudioBtn: "Stop Audio",
    heroAudioReading: "Reading introduction...",
    heroIntroSpeech: "Welcome to Smart Village, the digital village management platform. Smart Village connects villagers, Panchayat administrators, and workers in one unified system. Report issues using voice or text, get live updates, receive bilingual announcements, and build a better village community together.",

    // Why Smart Village (Problems & Solutions)
    whyTitle: "Why Smart Village?",
    whySubtitle: "Bridging the gap between villagers and administration through intelligent civic technology.",
    whyBeforeTitle: "Traditional Challenges",
    whyAfterTitle: "The Smart Village Solution",
    before1: "Villagers struggle to report local problems (must visit office physically).",
    before2: "People do not know the status of their complaints or who is working on them.",
    before3: "Important village announcements do not reach everyone in the village.",
    before4: "Field workers struggle to find exact problem locations without directions.",
    before5: "Panchayat administrators lack a central system to monitor village civic issues.",
    after1: "Instant digital complaint registration using Voice, Text, or Photo upload.",
    after2: "Transparent real-time status tracking with estimated completion dates.",
    after3: "Bilingual announcements in English and Telugu with instant audio read-aloud.",
    after4: "One-click GPS navigation guiding workers directly to the complaint location.",
    after5: "Centralized administrative dashboard with live analytics and worker allocation.",

    // Features Section
    featuresTitle: "Everything Your Village Needs in One Platform",
    featuresSubtitle: "Built with modern civic technology to deliver accessible, fast, and transparent village services.",
    feat1Title: "Smart Complaint Registration",
    feat1Desc: "Villagers can report problems such as water leakage, damaged roads, electricity issues, garbage and drainage problems.",
    feat1Tags: ["Voice Input", "Text & Photos", "Telugu & English", "Category Auto-Detect"],

    feat2Title: "AI Voice Assistant",
    feat2Desc: "Villagers can speak instead of typing. The system converts their voice into complaint text and helps them register their problems.",
    feat2Tags: ["Microphone Input", "Telugu Voice", "Speech-to-Text", "Zero-Typing Needed"],

    feat3Title: "GPS Complaint Tracking",
    feat3Desc: "Every complaint includes its exact GPS location so Panchayat administrators can identify where the problem exists without confusion.",
    feat3Tags: ["Interactive Map", "Pinpoint Accuracy", "Village Hotspots", "Duplicate Prevention"],

    feat4Title: "Smart Worker Assignment",
    feat4Desc: "Panchayat administrators can assign complaints to the appropriate field workers and monitor their work deadlines and progress.",
    feat4Tags: ["Worker Portals", "Priority Levels", "Deadline Management", "Accountability"],

    feat5Title: "One-Click Worker Navigation",
    feat5Desc: "Workers can open the complaint location directly in Google Maps without asking villagers for directions, speeding up response time.",
    feat5Tags: ["Google Maps Integration", "Turn-by-Turn Route", "Exact Coordinates", "Faster Fixes"],

    feat6Title: "Smart Village Announcements",
    feat6Desc: "Administrators can publish important village announcements in English and Telugu so every citizen can understand them easily.",
    feat6Tags: ["Bilingual Broadcasts", "Emergency Alerts", "Health & Water Updates", "Official Notices"],

    feat7Title: "AI Voice Announcements",
    feat7Desc: "Villagers who cannot comfortably read can listen to announcements in Telugu or English with one single tap on their phone.",
    feat7Tags: ["One-Tap Listening", "Native Telugu Audio", "Clear Pronunciation", "Inclusive Design"],

    feat8Title: "Complaint Status Tracking",
    feat8Desc: "Villagers can check whether their complaints are pending, assigned, in progress or resolved with live progress updates.",
    feat8Tags: ["Live Timeline", "Assigned Worker Info", "Resolution Proof", "SMS/App Updates"],

    feat9Title: "Admin Analytics & Monitoring",
    feat9Desc: "Panchayat administrators can monitor village complaints, worker performance and development activities from one unified dashboard.",
    feat9Tags: ["Civic Reports", "Department Metrics", "Resolution Rates", "Geographical Insights"],

    // How It Works
    howTitle: "How Smart Village Works",
    howSubtitle: "A seamless 4-step process connecting citizens, administration, and ground workers.",
    step1Title: "1. Report a Problem",
    step1Desc: "A villager reports a village problem using voice, text or a photograph with automatic GPS location.",
    step2Title: "2. Admin Reviews the Complaint",
    step2Desc: "The Panchayat administrator checks the complaint, verifies details, and identifies the responsible department.",
    step3Title: "3. Worker Gets the Assignment",
    step3Desc: "The administrator assigns the work to a specialized worker with the exact complaint location and deadline.",
    step4Title: "4. Problem Gets Resolved",
    step4Desc: "The worker navigates to the location via GPS, completes the work, uploads proof, and updates its status.",

    // Accessibility Section
    accessTitle: "Technology That Everyone Can Use",
    accessSubtitle: "Smart Village is designed for every villager, including people who cannot comfortably read or type.",
    accessCard1Title: "Speak Instead of Type",
    accessCard1Desc: "Report your problem using your voice in Telugu or English. Simply press the mic and speak naturally.",
    accessCard2Title: "Listen Instead of Read",
    accessCard2Desc: "Listen to important village announcements and complaint status in your preferred language with one tap.",
    accessCard3Title: "Simple and Easy Interface",
    accessCard3Desc: "Large buttons, intuitive icons, high-contrast text, and simple instructions help everyone navigate without difficulty.",
    accessListenNotice: "Try the voice assistant on this page by clicking the Listen button above or below.",

    // Announcements Section
    annTitle: "Latest Village Announcements",
    annSubtitle: "Official real-time updates, public notices, and emergency alerts from your Gram Panchayat.",
    annEmpty: "No published announcements available at the moment. Check back soon for updates.",
    annListenTe: "వినండి (Telugu)",
    annListenEn: "Listen (English)",
    annViewAll: "View All Announcements",
    annCategory: "Category",
    annPriority: "Priority",
    annPublishedOn: "Published",

    // Roles Section
    rolesTitle: "One Platform. Three Important Roles.",
    rolesSubtitle: "Dedicated digital workspaces tailored for citizens, field workers, and Panchayat officers.",
    role1Name: "Villagers & Citizens",
    role1Desc: "Report local problems, listen to announcements, track complaint progress and participate in village welfare.",
    role1Btn: "Access Villager Portal",
    role2Name: "Village Field Workers",
    role2Desc: "View assigned work orders, navigate to complaint locations with GPS, and update work completion proofs.",
    role2Btn: "Access Worker Portal",
    role3Name: "Panchayat Administrators",
    role3Desc: "Manage complaints, assign workers, publish bilingual announcements and monitor village development metrics.",
    role3Btn: "Access Admin Portal",

    // Impact & Benefits
    impactTitle: "Building Better Villages Through Digital Governance",
    impactSubtitle: "Empowering rural communities with transparent administration and responsive public services.",
    benefit1Title: "Faster Response Times",
    benefit1Desc: "Issues reach the right department instantly instead of waiting days for paper submissions.",
    benefit2Title: "100% Transparency",
    benefit2Desc: "Citizens track the exact progress, assigned staff, and resolution timeline of every report.",
    benefit3Title: "Inclusive for Everyone",
    benefit3Desc: "Voice reporting and audio announcements ensure non-literate citizens have equal access.",
    benefit4Title: "GPS Precision",
    benefit4Desc: "Workers reach the exact problem spot instantly without confusion or phone tag.",
    benefit5Title: "Emergency Preparedness",
    benefit5Desc: "Critical alerts for water cuts, health camps, or weather hazards reach all villagers in seconds.",
    benefit6Title: "Data-Driven Development",
    benefit6Desc: "Panchayats identify chronic infrastructure problem zones and plan village budgets effectively.",

    // Final CTA
    ctaTitle: "Your Village. Your Voice. Your Future.",
    ctaDesc: "Join Smart Village today and help build a more connected, transparent, and better-managed community.",
    ctaGetStarted: "Get Started Now",
    ctaExplore: "Explore All Features",

    // Contact
    contactTitle: "Gram Panchayat Helpdesk",
    contactSubtitle: "Have questions or need assistance? Reach out to your local administration.",
    contactOffice: "Panchayat Office",
    contactOfficeDesc: "Main Gram Panchayat Administrative Complex, Open Monday - Saturday 9:00 AM - 5:00 PM",
    contactHelplines: "Emergency Civic Helplines",
    contactWater: "Water Supply Cell: 1800-111-222",
    contactElectricity: "Electricity Department: 1912",
    contactSanitation: "Sanitation & Drainage: 1800-333-444",

    // Footer
    footerDesc: "Smart Village – A Digital Platform for Better Village Governance. Connecting citizens, workers, and administrators for sustainable village development.",
    footerQuickLinks: "Quick Navigation",
    footerPortals: "Role Portals",
    footerLegal: "Public Information",
    footerRights: "All rights reserved. Dedicated to rural community advancement.",
  },

  te: {
    // Brand & Nav
    brandName: "స్మార్ట్ విలేజ్ (SMART VILLAGE)",
    brandTagline: "డిజిటల్ గ్రామ పాలనా వేదిక",
    navHome: "హోమ్",
    navAbout: "గురించి",
    navFeatures: "ఫీచర్లు",
    navHowItWorks: "ఎలా పనిచేస్తుంది",
    navAnnouncements: "ప్రకటనలు",
    navRoles: "పోర్టల్స్",
    navContact: "సంప్రదించండి",
    navListen: "వినండి",
    navLogin: "లాగిన్",
    navGetStarted: "ప్రారంభించండి",
    langName: "తెలుగు",
    langToggleName: "English",

    // Hero
    heroTitle: "స్మార్ట్ విలేజ్",
    heroSubtitle: "గ్రామస్తులను అనుసంధానిస్తూ, సమాజాన్ని శక్తివంతం చేస్తూ, మెరుగైన రేపటిని నిర్మిస్తున్నాం.",
    heroDescription: "గ్రామ సమస్యలను నివేదించడానికి, ముఖ్యమైన ప్రకటనలను స్వీకరించడానికి, ప్రజా సేవలను ట్రాక్ చేయడానికి మరియు గ్రామస్తులను పంచాయతీ నిర్వాహకులతో అనుసంధానించడానికి ఒకే డిజిటల్ వేదిక.",
    heroExploreBtn: "మా సేవలను చూడండి",
    heroGetStartedBtn: "ప్రారంభించండి",
    heroListenBtn: "పరిచయాన్ని వినండి",
    heroStopAudioBtn: "ఆడియో ఆపండి",
    heroAudioReading: "పరిచయాన్ని చదువుతోంది...",
    heroIntroSpeech: "స్మార్ట్ విలేజ్ డిజిటల్ గ్రామ పాలనా వేదికకు స్వాగతం. స్మార్ట్ విలేజ్ గ్రామస్తులను, పంచాయతీ నిర్వాహకులను మరియు కార్మికులను ఒకే వ్యవస్థ ద్వారా అనుసంధానిస్తుంది. మీ గొంతు లేదా రాత ద్వారా సమస్యలను నమోదు చేయండి, తాజా ప్రకటనలను వినండి మరియు మీ గ్రామాన్ని ఆదర్శ గ్రామంగా మార్చుకోండి.",

    // Why Smart Village (Problems & Solutions)
    whyTitle: "స్మార్ట్ విలేజ్ ఎందుకు?",
    whySubtitle: "తెలివైన సివిక్ టెక్నాలజీ ద్వారా గ్రామస్తులు మరియు పంచాయతీ పరిపాలన మధ్య అంతరాన్ని తగ్గించడం.",
    whyBeforeTitle: "గతంలోని సాంప్రదాయ సమస్యలు",
    whyAfterTitle: "స్మార్ట్ విలేజ్ అందించే ఆధునిక పరిష్కారాలు",
    before1: "గ్రామస్తులు సమస్యలను నివేదించడానికి పంచాయతీ కార్యాలయానికి స్వయంగా వెళ్లాల్సి రావడం.",
    before2: "సమర్పించిన ఫిర్యాదు పరిస్థితి ఏమిటో, ఎవరు పరిష్కరిస్తున్నారో తెలియకపోవడం.",
    before3: "ముఖ్యమైన గ్రామ పంచాయతీ ప్రకటనలు ప్రతి ఇంటికి సకాలంలో చేరకపోవడం.",
    before4: "సమస్య ఉన్న ఖచ్చితమైన స్థలాన్ని గుర్తించడానికి కార్మికులు ఇబ్బంది పడటం.",
    before5: "గ్రామ సమస్యలను సమగ్రంగా పర్యవేక్షించడానికి అధికారులకు కేంద్ర వ్యవస్థ లేకపోవడం.",
    after1: "వాయిస్ (గొంతు), రాత లేదా ఫోటో ద్వారా నిమిషాల్లో డిజిటల్ ఫిర్యాదు నమోదు.",
    after2: "పూర్తయ్యే గడువు తేదీతో పాటు ప్రత్యక్ష స్థితిని పారదర్శకంగా తెలుసుకోవడం.",
    after3: "తెలుగు మరియు ఇంగ్లీషులో ప్రకటనలు మరియు ఒకే ట్యాప్‌తో ఆడియో ద్వారా వినే సదుపాయం.",
    after4: "గూగుల్ మ్యాప్స్ GPS ద్వారా నేరుగా సమస్య ఉన్న ప్రదేశానికి కార్మికులు చేరుకోవడం.",
    after5: "ప్రత్యక్ష విశ్లేషణలు మరియు కార్మికుల కేటాయింపుతో కూడిన కేంద్రీకృత అడ్మిన్ డ్యాష్‌బోర్డ్.",

    // Features Section
    featuresTitle: "మీ గ్రామానికి కావాల్సినవన్నీ ఒకే వేదికపై",
    featuresSubtitle: "పారదర్శకమైన, వేగవంతమైన మరియు అందరికీ అందుబాటులో ఉండే ప్రజా సేవలను అందించడానికి రూపొందించబడింది.",
    feat1Title: "స్మార్ట్ ఫిర్యాదు నమోదు",
    feat1Desc: "మంచి నీటి లీకేజీ, పాడైన రోడ్లు, వీధి దీపాల సమస్యలు, చెత్త మరియు మురుగునీటి సమస్యలను సులభంగా నివేదించవచ్చు.",
    feat1Tags: ["వాయిస్ ద్వారా నమోదు", "రాత & ఫోటోలు", "తెలుగు & ఇంగ్లీష్", "స్వయం చాలిత కేటగిరీ"],

    feat2Title: "AI వాయిస్ అసిస్టెంట్",
    feat2Desc: "టైప్ చేయకుండా గ్రామస్తులు తమ గొంతుతో మాట్లాడి సమస్యలను రికార్డ్ చేయవచ్చు. సిస్టమ్ దానిని ఫిర్యాదుగా మారుస్తుంది.",
    feat2Tags: ["మైక్రోఫోన్ సౌలభ్యం", "తెలుగు వాయిస్", "స్పీచ్ టు టెక్స్ట్", "టైపింగ్ అవసరం లేదు"],

    feat3Title: "GPS ఫిర్యాదు ట్రాకింగ్",
    feat3Desc: "ప్రతి ఫిర్యాదుతో పాటు ఖచ్చితమైన GPS స్థానం నమోదవుతుంది, దీనివల్ల పంచాయతీ నిర్వాహకులకు సమస్య ఎక్కడుందో వెంటనే తెలుస్తుంది.",
    feat3Tags: ["ఇంటరాక్టివ్ మ్యాప్", "ఖచ్చితమైన లొకేషన్", "సమస్యల హాట్‌స్పాట్స్", "డూప్లికేట్ నివారణ"],

    feat4Title: "స్మార్ట్ వర్కర్ కేటాయింపు",
    feat4Desc: "పంచాయతీ అధికారులు ఫిర్యాదులను సంబంధిత కార్మికులకు కేటాయించి, పనుల పురోగతిని మరియు గడువులను పర్యవేక్షిస్తారు.",
    feat4Tags: ["వర్కర్ పోర్టల్", "ప్రాధాన్యతా స్థాయిలు", "గడువు నిర్వహణ", "జవాబుదారీతనం"],

    feat5Title: "ఒకే క్లిక్‌తో వర్కర్ నావిగేషన్",
    feat5Desc: "కార్మికులు గ్రామస్తులను దారి అడగకుండా నేరుగా గూగుల్ మ్యాప్స్‌లో ఫిర్యాదు స్థానాన్ని తెరిచి వేగంగా చేరుకోవచ్చు.",
    feat5Tags: ["గూగుల్ మ్యాప్స్ నావిగేషన్", "రూట్ గైడెన్స్", "ఖచ్చితమైన కోఆర్డినేట్లు", "సత్వర పరిష్కారం"],

    feat6Title: "స్మార్ట్ గ్రామ ప్రకటనలు",
    feat6Desc: "పంచాయతీ అధికారులు ముఖ్యమైన గ్రామ నోటీసులను తెలుగు మరియు ఇంగ్లీషు రెండింటిలోనూ ఒకేసారి ప్రచురించవచ్చు.",
    feat6Tags: ["ద్విభాషా సమాచారం", "అత్యవసర హెచ్చరికలు", "ఆరోగ్య & నీటి నోటీసులు", "అధికారిక ప్రకటనలు"],

    feat7Title: "AI వాయిస్ ప్రకటనలు",
    feat7Desc: "చదవడం రాని గ్రామస్తులు ఒకే ట్యాప్‌తో తెలుగు లేదా ఇంగ్లీషులో ప్రకటనలను స్పష్టమైన గొంతుతో వినవచ్చు.",
    feat7Tags: ["సింగిల్ ట్యాప్ లిజనింగ్", "స్పష్టమైన తెలుగు ఆడియో", "ఉచ్ఛారణ సౌలభ్యం", "అందరికీ అందుబాటు"],

    feat8Title: "ఫిర్యాదు స్థితి ట్రాకింగ్",
    feat8Desc: "తమ ఫిర్యాదు పెండింగ్‌లో ఉందా, కేటాయించబడిందా లేదా పరిష్కరించబడిందా అని గ్రామస్తులు ప్రత్యక్షంగా తెలుసుకోవచ్చు.",
    feat8Tags: ["లైవ్ టైమ్‌లైన్", "కేటాయించిన వర్కర్ వివరాలు", "పరిష్కార రుజువు", "స్టేటస్ అప్‌డేట్స్"],

    feat9Title: "అడ్మిన్ విశ్లేషణలు & పర్యవేక్షణ",
    feat9Desc: "పంచాయతీ నిర్వాహకులు మొత్తం గ్రామ సమస్యలు, పరిష్కార శాతాలు మరియు అభివృద్ధి పనులను ఒకే డ్యాష్‌బోర్డ్ నుండి పర్యవేక్షించవచ్చు.",
    feat9Tags: ["సివిక్ నివేదికలు", "శాఖల వారీ లెక్కలు", "పరిష్కార వేగం", "భౌగోళిక వివరాలు"],

    // How It Works
    howTitle: "స్మార్ట్ విలేజ్ ఎలా పనిచేస్తుంది",
    howSubtitle: "పౌరులు, పంచాయతీ అధికారులు మరియు క్షేత్రస్థాయి కార్మికులను కలిపే 4 సులభమైన దశలు.",
    step1Title: "1. సమస్యను నివేదించండి",
    step1Desc: "గ్రామస్థుడు వాయిస్, రాత లేదా ఫోటో ద్వారా ఆటోమేటిక్ GPS స్థానంతో సమస్యను నమోదు చేస్తారు.",
    step2Title: "2. అడ్మిన్ పరిశీలన",
    step2Desc: "పంచాయతీ అధికారి ఫిర్యాదును పరిశీలించి, అది ఏ రంగానికి చెందినదో ధృవీకరిస్తారు.",
    step3Title: "3. వర్కర్‌కు పని కేటాయింపు",
    step3Desc: "అధికారి ఖచ్చితమైన స్థానం మరియు నిర్ణీత గడువుతో ఆ పనిని సంబంధిత కార్మికుడికి కేటాయిస్తారు.",
    step4Title: "4. సమస్య పరిష్కారం",
    step4Desc: "కార్మికుడు GPS ద్వారా స్థలానికి చేరుకుని, పని పూర్తి చేసి, రుజువు ఫోటోను అప్‌లోడ్ చేసి స్థితిని అప్‌డేట్ చేస్తారు.",

    // Accessibility Section
    accessTitle: "ప్రతి ఒక్కరూ సులభంగా ఉపయోగించగల సాంకేతికత",
    accessSubtitle: "చదవడం లేదా రాయడం రాని ప్రతి గ్రామస్థుడి కోసం స్మార్ట్ విలేజ్ ప్రత్యేకంగా రూపొందించబడింది.",
    accessCard1Title: "టైప్ చేయడానికి బదులుగా మాట్లాడండి",
    accessCard1Desc: "మీ సమస్యను తెలుగు లేదా ఇంగ్లీషులో గొంతుతో చెప్పండి. మైక్ నొక్కి సహజంగా మాట్లాడితే సరిపోతుంది.",
    accessCard2Title: "చదవడానికి బదులుగా వినండి",
    accessCard2Desc: "గ్రామ పంచాయతీ ప్రకటనలు మరియు ఫిర్యాదుల వివరాలను మీకు నచ్చిన భాషలో ఒక్క ట్యాప్‌తో వినవచ్చు.",
    accessCard3Title: "సరళమైన మరియు స్పష్టమైన ఇంటర్‌ఫేస్",
    accessCard3Desc: "పెద్ద బటన్లు, స్పష్టమైన చిహ్నాలు మరియు సులభమైన నావిగేషన్ వల్ల ఎవరైనా తడబడకుండా వాడవచ్చు.",
    accessListenNotice: "ఈ పేజీ పరిచయాన్ని వినడానికి పైన ఉన్న 'వినండి' బటన్‌పై క్లిక్ చేయండి.",

    // Announcements Section
    annTitle: "తాజా గ్రామ పంచాయతీ ప్రకటనలు",
    annSubtitle: "మీ గ్రామ పంచాయతీ నుండి నిజ-సమయ సమాచారం, ప్రజా నోటీసులు మరియు అత్యవసర సమాచారం.",
    annEmpty: "ప్రస్తుతం ఎలాంటి ప్రకటనలు అందుబాటులో లేవు. త్వరలో మళ్లీ చూడండి.",
    annListenTe: "వినండి (తెలుగు)",
    annListenEn: "Listen (English)",
    annViewAll: "అన్ని ప్రకటనలను చూడండి",
    annCategory: "వర్గం",
    annPriority: "ప్రాధాన్యత",
    annPublishedOn: "ప్రచురణ తేది",

    // Roles Section
    rolesTitle: "ఒకే వేదిక. మూడు ముఖ్యమైన బాధ్యతలు.",
    rolesSubtitle: "పౌరులు, కార్మికులు మరియు పంచాయతీ అధికారుల కోసం ప్రత్యేకంగా రూపొందించబడిన డిజిటల్ పోర్టల్స్.",
    role1Name: "గ్రామస్తులు & పౌరులు",
    role1Desc: "స్థానిక సమస్యలను నివేదించండి, ప్రకటనలను వినండి, ఫిర్యాదు స్థితిని తెలుసుకోండి మరియు గ్రామ అభివృద్ధిలో భాగస్వాములు కండి.",
    role1Btn: "గ్రామస్తుల పోర్టల్ లోకి వెళ్లండి",
    role2Name: "గ్రామ కార్మికులు",
    role2Desc: "కేటాయించిన పనులను చూడండి, GPS ద్వారా సమస్య ప్రదేశానికి చేరుకోండి మరియు పని పూర్తి చేసిన రుజువులను సమర్పించండి.",
    role2Btn: "వర్కర్ పోర్టల్ లోకి వెళ్లండి",
    role3Name: "పంచాయతీ నిర్వాహకులు",
    role3Desc: "ఫిర్యాదులను నిర్వహించండి, కార్మికులను నియమించండి, ద్విభాషా ప్రకటనలను ప్రచురించండి మరియు గ్రామ అభివృద్ధిని పర్యవేక్షించండి.",
    role3Btn: "అడ్మిన్ పోర్టల్ లోకి వెళ్లండి",

    // Impact & Benefits
    impactTitle: "డిజిటల్ పరిపాలన ద్వారా ఆదర్శ గ్రామాల నిర్మాణం",
    impactSubtitle: "పారదర్శకమైన పాలన మరియు వేగవంతమైన ప్రజా సేవల ద్వారా గ్రామీణ సమాజానికి సాధికారత.",
    benefit1Title: "వేగవంతమైన పరిష్కారాలు",
    benefit1Desc: "సమస్యల నివేదికలు అధికారుల బల్లలపై ఆగకుండా నేరుగా సంబంధిత సిబ్బందికి చేరతాయి.",
    benefit2Title: "100% పారదర్శకత",
    benefit2Desc: "ప్రతి ఫిర్యాదు యొక్క తాజా స్థితి, కేటాయించిన సిబ్బంది మరియు పరిష్కార వివరాలు పౌరులకు తెలుస్తాయి.",
    benefit3Title: "అందరికీ సమాన ప్రవేశం",
    benefit3Desc: "వాయిస్ రిపోర్టింగ్ మరియు ఆడియో రీడౌట్ వల్ల చదువురాని పౌరులు కూడా హాయిగా ఉపయోగించవచ్చు.",
    benefit4Title: "ఖచ్చితమైన GPS నావిగేషన్",
    benefit4Desc: "దారి వెతుక్కోకుండా కార్మికులు నేరుగా సమస్య ఉన్న ప్రదేశానికి చేరుకుని త్వరగా పనులు పూర్తి చేస్తారు.",
    benefit5Title: "అత్యవసర సమాచార ప్రసారం",
    benefit5Desc: "నీటి సరఫరా నిలిపివేత, ఆరోగ్య శిబిరాలు లేదా వాతావరణ సమాచారం నిమిషాల్లో అందరికీ చేరుతుంది.",
    benefit6Title: "డేటా ఆధారిత అభివృద్ధి ప్రణాళికలు",
    benefit6Desc: "ఎక్కువ సమస్యలు వచ్చే ప్రాంతాలను గుర్తించి పంచాయతీ నిధులను సరైన రీతిలో వినియోగించవచ్చు.",

    // Final CTA
    ctaTitle: "మీ గ్రామం. మీ స్వరం. మీ భవిష్యత్తు.",
    ctaDesc: "స్మార్ట్ విలేజ్ వేదికలో చేరండి, మరింత పారదర్శకమైన, పరిశుభ్రమైన మరియు అభివృద్ధి చెందిన గ్రామాన్ని నిర్మించండి.",
    ctaGetStarted: "ఇప్పుడే ప్రారంభించండి",
    ctaExplore: "ఫీచర్లను పరిశీలించండి",

    // Contact
    contactTitle: "గ్రామ పంచాయతీ సహాయ కేంద్రం",
    contactSubtitle: "ఏవైనా సందేహాలు ఉన్నా లేదా సహాయం కావాలన్నా స్థానిక పరిపాలనను సంప్రదించండి.",
    contactOffice: "పంచాయతీ కార్యాలయం",
    contactOfficeDesc: "ప్రధాన గ్రామ పంచాయతీ పరిపాలనా సముదాయం, సోమవారం - శనివారం ఉదయం 9:00 నుండి సాయంత్రం 5:00 వరకు.",
    contactHelplines: "అత్యవసర పౌర హెల్ప్‌లైన్లు",
    contactWater: "తాగునీటి సరఫరా: 1800-111-222",
    contactElectricity: "విద్యుత్ సమస్యలు: 1912",
    contactSanitation: "పారిశుధ్యం & మురుగునీరు: 1800-333-444",

    // Footer
    footerDesc: "స్మార్ట్ విలేజ్ – మెరుగైన గ్రామ పాలన కోసం డిజిటల్ వేదిక. సుస్థిర గ్రామీణాభివృద్ధి కోసం పౌరులు, కార్మికులు మరియు అధికారుల సమ్మేళనం.",
    footerQuickLinks: "ముఖ్యమైన లింకులు",
    footerPortals: "పోర్టల్స్",
    footerLegal: "సమాచార హక్కు & నియమాలు",
    footerRights: "అన్ని హక్కులూ ప్రత్యేకించబడ్డాయి. గ్రామీణ సేవకు అంకితం.",
  }
};

export const LanguageContext = createContext({
  lang: 'en',
  setLang: () => {},
  toggleLang: () => {},
  t: () => '',
});

export const LanguageProvider = ({ children }) => {
  const [lang, setLangState] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('smart_village_lang');
      if (saved === 'te' || saved === 'en') return saved;
    }
    return 'en';
  });

  const setLang = (newLang) => {
    const valid = newLang === 'te' ? 'te' : 'en';
    setLangState(valid);
    if (typeof window !== 'undefined') {
      localStorage.setItem('smart_village_lang', valid);
    }
  };

  const toggleLang = () => {
    setLang(lang === 'en' ? 'te' : 'en');
  };

  const t = (key) => {
    const currentDict = translations[lang] || translations.en;
    return currentDict[key] || translations.en[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
