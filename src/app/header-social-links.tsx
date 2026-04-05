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

const ICON_BASE_CLASS = "block h-[15px] w-[15px] shrink-0 flex-none fill-current text-current";

function VkIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      className={ICON_BASE_CLASS}
    >
      <path d="M12.785 16.241s.288-.032.435-.192c.135-.147.131-.425.131-.425s-.019-1.297.586-1.488c.596-.188 1.362 1.253 2.173 1.807.613.419 1.078.327 1.078.327l2.164-.03s1.131-.07.595-.96c-.044-.073-.316-.665-1.623-1.876-1.369-1.267-1.186-1.062.463-3.258 1.004-1.336 1.405-2.152 1.28-2.501-.12-.333-.86-.245-.86-.245l-2.436.015s-.181-.025-.315.055c-.131.077-.215.256-.215.256s-.385 1.024-.897 1.895c-1.079 1.838-1.51 1.937-1.686 1.823-.411-.266-.308-1.066-.308-1.634 0-1.775.269-2.516-.524-2.707-.263-.063-.458-.104-1.133-.111-.867-.009-1.599.003-2.015.206-.278.136-.491.438-.36.455.161.021.526.098.719.36.249.338.24 1.096.24 1.096s.143 2.089-.334 2.349c-.327.178-.777-.186-1.744-1.856-.495-.855-.87-1.8-.87-1.8s-.072-.173-.2-.265c-.155-.111-.372-.147-.372-.147l-2.315.015s-.348.01-.475.161c-.113.135-.009.413-.009.413s1.812 4.239 3.862 6.374c1.88 1.957 4.012 1.828 4.012 1.828h.966z" />
    </svg>
  );
}

function DiscordIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      className={`${ICON_BASE_CLASS} h-[8px] w-[8px] translate-x-[0.2px]`}
    >
      <path d="M20.317 4.3698a19.7913 19.7913 0 0 0-4.8851-1.5152.0741.0741 0 0 0-.0785.0371 13.7139 13.7139 0 0 0-.608 1.2495 18.2669 18.2669 0 0 0-5.487 0 12.6362 12.6362 0 0 0-.6171-1.2495.077.077 0 0 0-.0785-.037 19.7363 19.7363 0 0 0-4.8852 1.5152.0699.0699 0 0 0-.0321.0277C.5334 9.0467-.32 13.5799.099 18.0578a.0824.0824 0 0 0 .0312.0561 19.9 19.9 0 0 0 5.9938 3.0301.078.078 0 0 0 .0842-.0276 13.98 13.98 0 0 0 1.2265-1.9942.0761.0761 0 0 0-.0416-.1057 13.1066 13.1066 0 0 1-1.872-.8923.077.077 0 0 1-.0076-.1277 12.7551 12.7551 0 0 0 .3664-.2977.0743.0743 0 0 1 .0776-.0108c3.9278 1.7933 8.18 1.7933 12.061 0a.0743.0743 0 0 1 .0785.0096c.1176.1044.2408.2044.3664.2987a.0766.0766 0 0 1-.0064.1277 12.2992 12.2992 0 0 1-1.873.8912.0766.0766 0 0 0-.0407.1067c.3604.6878.7717 1.3548 1.2254 1.9932a.076.076 0 0 0 .0842.0286 19.8369 19.8369 0 0 0 6.002-3.0301.077.077 0 0 0 .0312-.055c.5-5.177-.838-9.6749-3.5485-13.66a.061.061 0 0 0-.0312-.0286ZM8.02 15.3312c-1.1836 0-2.1576-1.0857-2.1576-2.419 0-1.3332.9555-2.4189 2.1576-2.4189 1.211 0 2.175 1.0952 2.1576 2.419 0 1.3332-.9555 2.4189-2.1576 2.4189Zm7.9748 0c-1.1837 0-2.1576-1.0857-2.1576-2.419 0-1.3332.9555-2.4189 2.1576-2.4189 1.2109 0 2.1749 1.0952 2.1576 2.419 0 1.3332-.9469 2.4189-2.1576 2.4189Z" />
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      className={ICON_BASE_CLASS}
    >
      <path d="M21.94 4.66c.28-.12.58.13.5.42l-3.1 14.58c-.05.24-.32.35-.53.23l-4.83-3.18-2.46 2.36c-.17.16-.46.05-.47-.19l-.17-4.05 8.46-7.64c.15-.14-.03-.38-.21-.27l-10.54 6.65-4.34-1.38c-.28-.09-.3-.48-.03-.59L21.94 4.66Z" />
    </svg>
  );
}

function YoutubeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      className={ICON_BASE_CLASS}
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
    <div className="flex items-center gap-2">
      {showLabel ? (
        <span className="text-[10px] font-mono uppercase tracking-[0.24em] text-[#ffb7c5]">
          Socials:
        </span>
      ) : null}
      <div className="flex items-center gap-1.5 rounded-[14px] border border-[#3a2329] bg-[#120d10] px-2.5 py-1 shadow-[0_0_24px_rgba(255,183,197,0.08)]">
        {SOCIAL_LINKS.map((link) => {
          const commonClassName =
            "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md align-middle leading-none text-[#ffb7c5] transition duration-200";

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
