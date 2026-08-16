export type Experience = {
  organization: string;
  period: string;
  location: string;
  active?: boolean;
};

export type Education = {
  institution: string;
  degree: string;
  period: string;
  gpa: string;
  logo: string;
  accent: "gold" | "red";
  label: string;
};

export const profile = {
  name: "Midya Rahmani",
  location: "Toronto, Ontario",
  yearsExperience: "12+",
  linkedin: "https://www.linkedin.com/in/midyarahmani/",
  email: {
    user: "midya.ra",
    domain: "gmail.com",
  },
  hero:
    "Toronto-based, with 12+ years of professional experience across Adaptavist, CIBC, and Group of Gold Line. Graduate studies at the University of Waterloo; undergraduate at York University.",
  about: [
    "My curiosity lives where technology meets markets. I follow artificial intelligence and investing closely, and how each reshapes the other.",
    "Away from the screen, it is usually basketball, motorcycles, and travel, plus a steady habit of tracking where emerging technology and markets are heading.",
    "Fluent in English and Persian.",
  ],
  experience: [
    {
      organization: "Adaptavist",
      period: "Feb 2021 — Present",
      location: "Remote",
      active: true,
    },
    {
      organization: "CIBC",
      period: "2016 — 2021",
      location: "Toronto",
    },
    {
      organization: "Group of Gold Line",
      period: "Oct 2012 — Aug 2015",
      location: "Markham",
    },
  ] satisfies Experience[],
  education: [
    {
      institution: "University of Waterloo",
      degree: "MSc — Management Science",
      period: "2021 — 2023",
      gpa: "3.9 / 4.0",
      logo: "/waterloo-logo.svg",
      accent: "gold",
      label: "Graduate studies",
    },
    {
      institution: "York University",
      degree: "BCom (Hons) — Commerce & IT",
      period: "2011 — 2016",
      gpa: "3.3 / 4.0",
      logo: "/york-logo.svg",
      accent: "red",
      label: "Undergraduate studies",
    },
  ] satisfies Education[],
  interests: [
    "Artificial intelligence",
    "Investing",
    "Markets",
    "Basketball",
    "Motorcycles",
    "Travel",
    "Emerging technology",
  ],
} as const;

export const emailAddress = `${profile.email.user}@${profile.email.domain}`;
