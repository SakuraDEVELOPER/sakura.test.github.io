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
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      className="block h-[14.5px] w-[14.5px] shrink-0 flex-none fill-current text-current [transform:scale(1.12)]"
    >
      <path d="M12.785 16.241s.288-.032.435-.192c.135-.147.131-.425.131-.425s-.019-1.297.586-1.488c.596-.188 1.362 1.253 2.173 1.807.613.419 1.078.327 1.078.327l2.164-.03s1.131-.07.595-.96c-.044-.073-.316-.665-1.623-1.876-1.369-1.267-1.186-1.062.463-3.258 1.004-1.336 1.405-2.152 1.28-2.501-.12-.333-.86-.245-.86-.245l-2.436.015s-.181-.025-.315.055c-.131.077-.215.256-.215.256s-.385 1.024-.897 1.895c-1.079 1.838-1.51 1.937-1.686 1.823-.411-.266-.308-1.066-.308-1.634 0-1.775.269-2.516-.524-2.707-.263-.063-.458-.104-1.133-.111-.867-.009-1.599.003-2.015.206-.278.136-.491.438-.36.455.161.021.526.098.719.36.249.338.24 1.096.24 1.096s.143 2.089-.334 2.349c-.327.178-.777-.186-1.744-1.856-.495-.855-.87-1.8-.87-1.8s-.072-.173-.2-.265c-.155-.111-.372-.147-.372-.147l-2.315.015s-.348.01-.475.161c-.113.135-.009.413-.009.413s1.812 4.239 3.862 6.374c1.88 1.957 4.012 1.828 4.012 1.828h.966z" />
    </svg>
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
      className="block h-[15px] w-[15px] shrink-0 flex-none translate-y-[0.4px] fill-current text-current"
    >
      <path d="M13.545 2.907a13.2 13.2 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.2 12.2 0 0 0-3.658 0 8 8 0 0 0-.412-.833.05.05 0 0 0-.052-.025 13.2 13.2 0 0 0-3.257 1.011.04.04 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032q.003.022.021.037a13.3 13.3 0 0 0 3.995 2.02.05.05 0 0 0 .056-.019q.463-.63.818-1.329a.05.05 0 0 0-.01-.059l-.018-.011a9 9 0 0 1-1.248-.595.05.05 0 0 1-.02-.066l.015-.019q.127-.095.248-.195a.05.05 0 0 1 .051-.007c2.619 1.196 5.454 1.196 8.041 0a.05.05 0 0 1 .053.007q.121.1.248.195a.05.05 0 0 1-.004.085 8 8 0 0 1-1.249.594.05.05 0 0 0-.03.03.05.05 0 0 0 .003.041c.24.465.515.909.817 1.329a.05.05 0 0 0 .056.019 13.2 13.2 0 0 0 4.001-2.02.05.05 0 0 0 .021-.037c.334-3.451-.559-6.449-2.366-9.106a.03.03 0 0 0-.02-.019m-8.198 7.307c-.789 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612m5.316 0c-.788 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612" />
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
      className="block h-[15px] w-[15px] shrink-0 flex-none -translate-y-[0.2px] fill-current text-current"
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
      className="block h-[15px] w-[15px] shrink-0 flex-none fill-current text-current"
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
    href: "https://www.youtube.com/@Sakura-cheat",
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
      <div className="flex items-center gap-2.5 rounded-[18px] border border-[#3a2329] bg-[#120d10] px-3.5 py-2 shadow-[0_0_24px_rgba(255,183,197,0.08)]">
        {SOCIAL_LINKS.map((link) => {
          const commonClassName =
            "inline-flex h-6 w-6 shrink-0 items-center justify-center align-middle text-[#ffb7c5] transition duration-200";

          if (!link.href) {
            return (
              <span
                key={link.id}
                title={`${link.label} soon`}
                aria-label={`${link.label} coming soon`}
                className={`${commonClassName} cursor-default opacity-65`}
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
            >
              {link.icon}
            </a>
          );
        })}
      </div>
    </div>
  );
}
