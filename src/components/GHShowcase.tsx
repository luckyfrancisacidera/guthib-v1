import { Trophy, ShoppingBag, Sparkles, BarChart3, Target, Users } from "lucide-react";

const features = [
  {
    icon: Trophy,
    title: "XP & Levels",
    description: "Earn experience points for every contribution. Level up your profile as you learn, build, and collaborate.",
    accent: "from-amber-500/20 to-orange-500/20",
    iconColor: "text-amber-500",
  },
  {
    icon: Target,
    title: "Mission Boards",
    description: "Take on community missions, submit solutions, and earn XP rewards when your work gets approved.",
    accent: "from-emerald-500/20 to-teal-500/20",
    iconColor: "text-emerald-500",
  },
  {
    icon: ShoppingBag,
    title: "Reward Shop",
    description: "Spend earned XP on cosmetic upgrades — avatar borders, glowing names, badge styles, and profile accents.",
    accent: "from-purple-500/20 to-pink-500/20",
    iconColor: "text-purple-500",
  },
  {
    icon: Sparkles,
    title: "Profile Customization",
    description: "Stand out with equipped cosmetics visible to everyone. Your profile, your style.",
    accent: "from-sky-500/20 to-blue-500/20",
    iconColor: "text-sky-500",
  },
  {
    icon: BarChart3,
    title: "Leaderboards",
    description: "Compete for the top spot on the global leaderboard ranked by total XP. Opt in or stay private.",
    accent: "from-rose-500/20 to-red-500/20",
    iconColor: "text-rose-500",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description: "Create shared boards, invite collaborators to repositories, and review submitted solutions together.",
    accent: "from-indigo-500/20 to-violet-500/20",
    iconColor: "text-indigo-500",
  },
];

const GHShowcase = () => {
  return (
    <section className="py-20 lg:py-32 gh-section-border">
      <div className="max-w-[1280px] mx-auto px-4 lg:px-8">
        <p className="text-primary text-sm font-medium text-center mb-3 tracking-wider uppercase">
          Level up your journey
        </p>
        <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 text-center">
          Learn, earn, and customize
        </h2>
        <p className="text-muted-foreground text-center max-w-xl mx-auto mb-14">
          Every action counts. Complete missions, climb leaderboards, and unlock cosmetic rewards to make your profile truly yours.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={i}
                className="group rounded-xl border border-border bg-card/60 p-6 transition-all hover:border-muted-foreground/30 hover:shadow-lg hover:shadow-primary/5"
              >
                <div
                  className={`w-11 h-11 rounded-xl bg-gradient-to-br ${f.accent} flex items-center justify-center mb-4 transition-transform group-hover:scale-110`}
                >
                  <Icon className={`w-5 h-5 ${f.iconColor}`} />
                </div>
                <h4 className="font-display font-semibold mb-1.5">{f.title}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default GHShowcase;
