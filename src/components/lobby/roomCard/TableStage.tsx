import { useTranslations } from "next-intl";
import UserAvatar from "@/components/ui/UserAvatar";
import { SeatSlot, SEAT_RING } from "./helpers";

const HOST_RING =
  "0 0 0 2.5px #f5c451,0 0 18px rgba(245,196,81,0.6),0 4px 12px rgba(0,0,0,0.55)";

type Props = {
  hostName: string;
  hostAvatar?: string;
  seats: SeatSlot[];
};

/**
 * The 3D poker-table stage: leather chairs ring the rail, the host sits at the
 * head (center of the felt), and players take their seats on foreshortened
 * leather pads around the rim. Everything sizes off container-query units so the
 * whole table scales cleanly from the wide lobby grid down to a 390px phone.
 */
export default function TableStage({ hostName, hostAvatar, seats }: Props) {
  const t = useTranslations("game");

  // Container-query-scaled sizes: avatar, name font, host avatar, host name box.
  const stageVars = {
    "--av": "clamp(28px,7.2cqw,50px)",
    "--nf": "clamp(10px,1.9cqw,13px)",
    "--hostav": "clamp(36px,8.2cqw,58px)",
    "--hostname": "clamp(78px,15cqw,160px)",
  } as React.CSSProperties;

  return (
    <div
      className="relative w-full"
      style={{
        containerType: "inline-size",
        aspectRatio: "1 / 0.74",
        margin: "4px 0 2px",
        ...stageVars,
      }}
    >
      {/* Chairs behind (and in front of) the rail */}
      {seats.map((s) => (
        <div
          key={`chair-${s.key}`}
          className="absolute"
          style={{
            left: `${s.chx}%`,
            top: `${s.chy}%`,
            width: "calc(var(--av) * 1.55)",
            height: "calc(var(--av) * 1.85)",
            transform: s.radialTf,
            zIndex: s.chairZ,
          }}
        >
          <div
            style={{
              position: "absolute",
              left: "8%",
              right: "8%",
              top: 0,
              height: "74%",
              borderRadius: "46% 46% 26% 26% / 60% 60% 24% 24%",
              background:
                "linear-gradient(180deg,#2a2a30 0%,#17171b 55%,#0c0c0f 100%)",
              boxShadow:
                "inset 0 3px 5px rgba(255,255,255,0.07),inset 0 -6px 10px rgba(0,0,0,0.5),0 12px 20px rgba(0,0,0,0.55)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: "22%",
              right: "22%",
              top: "6%",
              height: "32%",
              borderRadius: "50%",
              background:
                "linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0) 90%)",
            }}
          />
        </div>
      ))}

      {/* Table: rail thickness + rounded rail + felt with the host at the head */}
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          transform: "translate(-50%,-50%)",
          width: "78%",
          height: "82%",
          zIndex: 2,
        }}
      >
        {/* rail thickness / side */}
        <div
          style={{
            position: "absolute",
            left: "2%",
            right: "2%",
            top: "12%",
            bottom: "-9%",
            borderRadius: "50%",
            background:
              "linear-gradient(180deg,#232327 0%,#141417 50%,#08080a 100%)",
            boxShadow:
              "0 30px 46px rgba(0,0,0,0.7),0 12px 20px rgba(0,0,0,0.55)",
          }}
        />
        {/* rounded outer rail */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background:
              "radial-gradient(ellipse at 50% 24%,#37373d 0%,#26262b 40%,#1a1a1e 66%,#101013 100%)",
            boxShadow:
              "inset 0 4px 8px rgba(255,255,255,0.09),inset 0 -14px 26px rgba(0,0,0,0.65),0 0 30px rgba(150,25,35,0.16)",
          }}
        >
          {/* specular sheen on the rail top */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "2%",
              width: "60%",
              height: "22%",
              transform: "translateX(-50%)",
              borderRadius: "50%",
              background:
                "linear-gradient(180deg,rgba(255,255,255,0.13),rgba(255,255,255,0) 85%)",
            }}
          />
        </div>
        {/* felt inset */}
        <div
          className="flex items-center justify-center"
          style={{
            position: "absolute",
            inset: "13% 10%",
            borderRadius: "50%",
            background:
              "radial-gradient(ellipse at 50% 34%,#20141a 0%,#160d12 46%,#0d080c 78%,#080509 100%)",
            boxShadow:
              "inset 0 8px 26px rgba(0,0,0,0.7),inset 0 0 0 1px rgba(220,38,38,0.22),inset 0 0 22px rgba(180,30,45,0.14)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: "9%",
              borderRadius: "50%",
              boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.04)",
            }}
          />
          {/* overhead spotlight */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "8%",
              width: "66%",
              height: "66%",
              transform: "translateX(-50%)",
              borderRadius: "50%",
              background:
                "radial-gradient(ellipse at 50% 34%,rgba(255,180,150,0.12),rgba(255,120,120,0) 70%)",
              pointerEvents: "none",
            }}
          />
          {/* host at the head */}
          <div
            className="relative flex flex-col items-center gap-0.5"
            style={{ zIndex: 2 }}
          >
            <div
              className="relative"
              style={{ width: "var(--hostav)", height: "var(--hostav)" }}
            >
              <div
                className="flex"
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "50%",
                  boxShadow: HOST_RING,
                }}
              >
                <UserAvatar
                  src={hostAvatar}
                  name={hostName}
                  size="var(--hostav)"
                />
              </div>
              <div
                className="absolute left-1/2 -translate-x-1/2"
                style={{
                  top: "-9px",
                  filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.7))",
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="#f5c451"
                  stroke="#7c4a10"
                  strokeWidth="1.1"
                  strokeLinejoin="round"
                  style={{
                    width: "calc(var(--hostav) * 0.42)",
                    height: "calc(var(--hostav) * 0.42)",
                  }}
                >
                  <path d="m5 16-3-10 6.5 5L12 4l3.5 7L22 6l-3 10H5z" />
                </svg>
              </div>
            </div>
            <span className="mt-0.5 font-orbitron text-[length:clamp(0.4rem,2cqw,0.54rem)] font-bold tracking-[0.22em] text-[#f5c451]">
              {t("row.host").toUpperCase()}
            </span>
            <span
              className="overflow-hidden text-ellipsis whitespace-nowrap text-center font-semibold text-[#fde9c0]"
              style={{ maxWidth: "var(--hostname)", fontSize: "var(--nf)" }}
            >
              {hostName}
            </span>
          </div>
        </div>
      </div>

      {/* Seat pads + avatars on the felt rim */}
      {seats.map((s) => (
        <div
          key={s.key}
          className="group absolute z-[5] hover:z-[9]"
          style={{ left: `${s.x}%`, top: `${s.y}%` }}
        >
          {/* leather seat pad, angled radially toward the center */}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: "calc(var(--av) * 1.22)",
              height: "calc(var(--av) * 1.5)",
              transform: s.radialTf,
              borderRadius: "22%",
              background:
                "linear-gradient(180deg,#20201f 0%,#141413 60%,#0b0b0a 100%)",
              boxShadow:
                "inset 0 2px 3px rgba(255,255,255,0.05),inset 0 -3px 6px rgba(0,0,0,0.5),0 4px 8px rgba(0,0,0,0.45)",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: "22%",
                right: "22%",
                top: "9%",
                height: "3px",
                borderRadius: "3px",
                background: s.padAccent,
                boxShadow: `0 0 6px ${s.padGlow}`,
              }}
            />
          </div>

          {/* avatar / empty slot, upright and centered on the pad */}
          <div
            className="flex flex-col items-center"
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              transform: "translate(-50%,-50%)",
            }}
          >
            {s.player ? (
              <>
                <div
                  className="relative flex"
                  style={{
                    width: "var(--av)",
                    height: "var(--av)",
                    borderRadius: "50%",
                    boxShadow: SEAT_RING,
                  }}
                >
                  <UserAvatar
                    src={s.player.avatar}
                    name={s.player.nickname}
                    size="var(--av)"
                    className={s.dead ? "grayscale" : ""}
                  />
                  {s.dead && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-[rgba(120,10,10,0.5)]">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#fca5a5"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ width: "55%", height: "55%" }}
                      >
                        <circle cx="9" cy="12" r="1" />
                        <circle cx="15" cy="12" r="1" />
                        <path d="M8 20v2h8v-2" />
                        <path d="m12.5 17-.5-1-.5 1h1z" />
                        <path d="M16 20a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20" />
                      </svg>
                    </div>
                  )}
                </div>
                <div
                  className={`pointer-events-none absolute left-1/2 top-[calc(100%+5px)] max-w-[130px] -translate-x-1/2 overflow-hidden text-ellipsis whitespace-nowrap rounded-md border border-white/[0.08] bg-[rgba(8,6,12,0.94)] px-2 py-0.5 text-center text-[0.72rem] font-medium opacity-0 shadow-[0_4px_12px_rgba(0,0,0,0.55)] transition-opacity group-hover:opacity-100 ${
                    s.dead
                      ? "text-red-400 line-through decoration-red-400/70"
                      : "text-gray-100"
                  }`}
                >
                  {s.player.nickname}
                </div>
              </>
            ) : (
              <>
                <div
                  className="flex items-center justify-center rounded-full border-2 border-dashed border-white/[0.18] bg-white/[0.02] font-orbitron text-white/[0.28]"
                  style={{
                    width: "var(--av)",
                    height: "var(--av)",
                    fontSize: "calc(var(--av) * 0.34)",
                  }}
                >
                  {s.seatNumber}
                </div>
                <div className="pointer-events-none absolute left-1/2 top-[calc(100%+5px)] -translate-x-1/2 whitespace-nowrap rounded-md border border-white/[0.08] bg-[rgba(8,6,12,0.94)] px-2 py-0.5 text-center text-[0.72rem] text-white/40 opacity-0 transition-opacity group-hover:opacity-100">
                  {t("row.openSeat")}
                </div>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
