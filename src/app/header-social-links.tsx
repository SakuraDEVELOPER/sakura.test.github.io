"use client";

import type { ReactNode } from "react";

type HeaderSocialLinksProps = {
  showLabel?: boolean;
};

type SocialLinkDefinition = {
  id: "vk" | "youtube" | "discord" | "telegram";
  label: string;
  href?: string;
  icon: ReactNode;
};

function VkIcon() {
  return (
    <span
      aria-hidden="true"
      className="inline-flex h-4 w-4 shrink-0 flex-none items-center justify-center text-[11px] font-black italic leading-none tracking-[-0.12em] text-current"
      style={{ fontFamily: "Arial Black, Arial, sans-serif" }}
    >
      VK
    </span>
  );
}

function DiscordIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      className="block h-4 w-4 shrink-0 flex-none fill-current text-current"
    >
      <path d="M19.54 5.57A16.7 16.7 0 0 0 15.4 4.3a.08.08 0 0 0-.09.04c-.18.33-.38.76-.52 1.1a15.5 15.5 0 0 0-4.59 0 11.8 11.8 0 0 0-.53-1.1.08.08 0 0 0-.09-.04 16.67 16.67 0 0 0-4.15 1.27.07.07 0 0 0-.03.03C2.77 9.5 2.08 13.31 2.42 17.07a.08.08 0 0 0 .03.06 16.8 16.8 0 0 0 5.1 2.58.08.08 0 0 0 .09-.03c.39-.53.74-1.09 1.04-1.68a.08.08 0 0 0-.04-.11 10.9 10.9 0 0 1-1.6-.77.08.08 0 0 1-.01-.13c.11-.08.22-.17.32-.25a.08.08 0 0 1 .08-.01c3.35 1.53 6.98 1.53 10.3 0a.08.08 0 0 1 .09.01c.1.08.21.17.32.25a.08.08 0 0 1-.01.13c-.51.3-1.05.56-1.6.77a.08.08 0 0 0-.04.11c.31.58.66 1.14 1.04 1.68a.08.08 0 0 0 .09.03 16.75 16.75 0 0 0 5.1-2.58.08.08 0 0 0 .03-.06c.4-4.34-.67-8.12-2.99-11.47a.06.06 0 0 0-.03-.03ZM9.67 14.78c-1 0-1.82-.92-1.82-2.05s.8-2.05 1.82-2.05c1.02 0 1.84.93 1.82 2.05 0 1.13-.8 2.05-1.82 2.05Zm4.66 0c-1.01 0-1.82-.92-1.82-2.05s.8-2.05 1.82-2.05c1.03 0 1.84.93 1.82 2.05 0 1.13-.8 2.05-1.82 2.05Z" />
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      className="block h-4 w-4 shrink-0 flex-none fill-current"
    >
      <path d="M21.94 4.66c.28-.12.58.13.5.42l-3.1 14.58c-.05.24-.32.35-.53.23l-4.83-3.18-2.46 2.36c-.17.16-.46.05-.47-.19l-.17-4.05 8.46-7.64c.15-.14-.03-.38-.21-.27l-10.54 6.65-4.34-1.38c-.28-.09-.3-.48-.03-.59L21.94 4.66Z" />
    </svg>
  );
}

function YoutubeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      className="block h-4 w-4 shrink-0 flex-none fill-current"
    >
      <path d="M21.1 8.2a2.9 2.9 0 0 0-2.04-2.05C17.31 5.67 12 5.67 12 5.67s-5.31 0-7.06.48A2.9 2.9 0 0 0 2.9 8.2c-.48 1.75-.48 3.8-.48 3.8s0 2.05.48 3.8a2.9 2.9 0 0 0 2.04 2.05c1.75.48 7.06.48 7.06.48s5.31 0 7.06-.48a2.9 2.9 0 0 0 2.04-2.05c.48-1.75.48-3.8.48-3.8s0-2.05-.48-3.8ZM10.3 15.26V8.74L15.9 12l-5.6 3.26Z" />
    </svg>
  );
}

const SOCIAL_LINKS: SocialLinkDefinition[] = [
  {
    id: "vk",
    label: "VK",
    href: "https://vk.com/sakura_cheat",
    icon: <VkIcon />,
  },
  {
    id: "youtube",
    label: "YouTube",
    icon: <YoutubeIcon />,
  },
  {
    id: "discord",
    label: "Discord",
    href: "https://discord.gg/NQbe3xEfu5",
    icon: <DiscordIcon />,
  },
  {
    id: "telegram",
    label: "Telegram",
    href: "https://t.me/sakura_dota2",
    icon: <TelegramIcon />,
  },
];

export function HeaderSocialLinks({
  showLabel = false,
}: HeaderSocialLinksProps) {
  return (
    <div className="flex items-center gap-3">
      {showLabel ? (
        <span className="text-[10px] font-mono uppercase tracking-[0.24em] text-[#ffb7c5]">
          Socials:
        </span>
      ) : null}
      <div className="flex items-center gap-3 rounded-[18px] border border-[#3a2329] bg-[#120d10] px-4 py-2 shadow-[0_0_24px_rgba(255,183,197,0.08)]">
        {SOCIAL_LINKS.map((link) => {
          const commonClassName =
            "inline-flex h-5 w-5 shrink-0 items-center justify-center align-middle text-[#ffb7c5] transition duration-200";

          if (!link.href) {
            return (
              <span
                key={link.id}
                title={`${link.label} soon`}
                aria-label={`${link.label} coming soon`}
                className={`${commonClassName} cursor-default opacity-65`}
                style={{ width: 20, height: 20 }}
              >
                {link.icon}
              </span>
            );
          }

          return (
            <a
              key={link.id}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              aria-label={link.label}
              className={`${commonClassName} hover:text-[#ffd7e1]`}
              style={{ width: 20, height: 20 }}
            >
              {link.icon}
            </a>
          );
        })}
      </div>
    </div>
  );
}
