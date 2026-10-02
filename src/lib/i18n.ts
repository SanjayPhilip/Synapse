import { useState, useEffect } from "react";

export type Locale = "en" | "es" | "fr" | "de";

export const translations: Record<Locale, Record<string, string>> = {
  en: {
    "nav.dashboard": "Dashboard",
    "nav.resume": "My Resume",
    "nav.jobs": "Job Feed",
    "nav.applications": "Applications",
    "nav.analytics": "Analytics",
    "nav.settings": "Settings",
    "nav.alerts": "Job Alerts",
    "nav.referrals": "Referral Program",
    "nav.logout": "Sign Out",
    "common.search": "Search...",
    "common.loading": "Loading...",
    "common.save": "Save Changes",
    "common.cancel": "Cancel",
    "common.apply": "Apply Now",
    "common.matchScore": "Match Score",
    "common.viewCompany": "View Company",
    "auth.welcomeBack": "Welcome Back",
    "auth.signIn": "Sign In",
    "auth.signUp": "Sign Up",
    "auth.orContinueWith": "or continue with",
    "auth.socialGoogle": "Continue with Google",
    "auth.socialLinkedIn": "Continue with LinkedIn",
    "auth.socialGitHub": "Continue with GitHub",
    "referral.title": "Invite Friends & Earn Rewards",
    "referral.copy": "Copy Invite Link",
    "referral.shareMsg": "Share your referral link with peers and earn reward credits on every successful signup.",
    "company.openRoles": "Open Roles",
    "company.aboutUs": "About Us",
    "company.perks": "Perks & Benefits",
    "company.culture": "Company Culture",
  },
  es: {
    "nav.dashboard": "Panel de Control",
    "nav.resume": "Mi Currículum",
    "nav.jobs": "Ofertas de Empleo",
    "nav.applications": "Postulaciones",
    "nav.analytics": "Analítica",
    "nav.settings": "Configuración",
    "nav.alerts": "Alertas de Empleo",
    "nav.referrals": "Programa de Referidos",
    "nav.logout": "Cerrar Sesión",
    "common.search": "Buscar...",
    "common.loading": "Cargando...",
    "common.save": "Guardar Cambios",
    "common.cancel": "Cancelar",
    "common.apply": "Postularme",
    "common.matchScore": "Puntaje de Ajuste",
    "common.viewCompany": "Ver Empresa",
    "auth.welcomeBack": "Bienvenido de nuevo",
    "auth.signIn": "Iniciar Sesión",
    "auth.signUp": "Registrarse",
    "auth.orContinueWith": "o continuar con",
    "auth.socialGoogle": "Continuar con Google",
    "auth.socialLinkedIn": "Continuar con LinkedIn",
    "auth.socialGitHub": "Continuar con GitHub",
    "referral.title": "Invita Amigos y Gana Recompensas",
    "referral.copy": "Copiar Enlace",
    "referral.shareMsg": "Comparte tu enlace de referido y gana créditos por cada registro exitoso.",
    "company.openRoles": "Puestos Abiertos",
    "company.aboutUs": "Sobre Nosotros",
    "company.perks": "Beneficios",
    "company.culture": "Cultura de la Empresa",
  },
  fr: {
    "nav.dashboard": "Tableau de Bord",
    "nav.resume": "Mon CV",
    "nav.jobs": "Offres d'Emploi",
    "nav.applications": "Candidatures",
    "nav.analytics": "Statistiques",
    "nav.settings": "Paramètres",
    "nav.alerts": "Alertes Emploi",
    "nav.referrals": "Parrainage",
    "nav.logout": "Se Déconnecter",
    "common.search": "Rechercher...",
    "common.loading": "Chargement...",
    "common.save": "Sauvegarder",
    "common.cancel": "Annuler",
    "common.apply": "Postuler",
    "common.matchScore": "Score de Correspondance",
    "common.viewCompany": "Voir l'Entreprise",
    "auth.welcomeBack": "Bon retour",
    "auth.signIn": "Connexion",
    "auth.signUp": "Inscription",
    "auth.orContinueWith": "ou continuer avec",
    "auth.socialGoogle": "Continuer avec Google",
    "auth.socialLinkedIn": "Continuer avec LinkedIn",
    "auth.socialGitHub": "Continuer avec GitHub",
    "referral.title": "Invitez des Amis et Gagnez des Récompenses",
    "referral.copy": "Copier le Lien",
    "referral.shareMsg": "Partagez votre lien de parrainage et gagnez des récompenses.",
    "company.openRoles": "Postes Ouverts",
    "company.aboutUs": "À Propos",
    "company.perks": "Avantages",
    "company.culture": "Culture d'Entreprise",
  },
  de: {
    "nav.dashboard": "Übersicht",
    "nav.resume": "Mein Lebenslauf",
    "nav.jobs": "Stellenangebote",
    "nav.applications": "Bewerbungen",
    "nav.analytics": "Analytik",
    "nav.settings": "Einstellungen",
    "nav.alerts": "Job-Benachrichtigungen",
    "nav.referrals": "Empfehlungsprogramm",
    "nav.logout": "Abmelden",
    "common.search": "Suchen...",
    "common.loading": "Laden...",
    "common.save": "Änderungen Speichern",
    "common.cancel": "Abbrechen",
    "common.apply": "Jetzt Bewerben",
    "common.matchScore": "Übereinstimmung",
    "common.viewCompany": "Unternehmen ansehen",
    "auth.welcomeBack": "Willkommen zurück",
    "auth.signIn": "Anmelden",
    "auth.signUp": "Registrieren",
    "auth.orContinueWith": "oder weiter mit",
    "auth.socialGoogle": "Weiter mit Google",
    "auth.socialLinkedIn": "Weiter mit LinkedIn",
    "auth.socialGitHub": "Weiter mit GitHub",
    "referral.title": "Freunde einladen & Prämien sichern",
    "referral.copy": "Link kopieren",
    "referral.shareMsg": "Teile deinen Empfehlungslink und verdiene Prämien.",
    "company.openRoles": "Offene Stellen",
    "company.aboutUs": "Über uns",
    "company.perks": "Benefits",
    "company.culture": "Unternehmenskultur",
  },
};

const LOCALE_KEY = "synapse_locale";

export function getStoredLocale(): Locale {
  const stored = localStorage.getItem(LOCALE_KEY) as Locale | null;
  if (stored && ["en", "es", "fr", "de"].includes(stored)) {
    return stored;
  }
  return "en";
}

export function setStoredLocale(loc: Locale): void {
  localStorage.setItem(LOCALE_KEY, loc);
  window.dispatchEvent(new CustomEvent("synapse_locale_change", { detail: loc }));
}

export function useI18n() {
  const [locale, setLocale] = useState<Locale>(getStoredLocale);

  useEffect(() => {
    const handler = (e: any) => {
      if (e.detail) setLocale(e.detail);
    };
    window.addEventListener("synapse_locale_change", handler);
    return () => window.removeEventListener("synapse_locale_change", handler);
  }, []);

  const t = (key: string, defaultText?: string): string => {
    return translations[locale]?.[key] || defaultText || key;
  };

  const changeLocale = (newLoc: Locale) => {
    setStoredLocale(newLoc);
    setLocale(newLoc);
  };

  return { locale, t, changeLocale };
}
