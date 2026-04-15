import GHNavbar from "@/components/GHNavbar";
import GHHero from "@/components/GHHero";
import GHFeatures from "@/components/GHFeatures";
import GHShowcase from "@/components/GHShowcase";
import GHCustomers from "@/components/GHCustomers";
import GHSecurity from "@/components/GHSecurity";
import GHCollaboration from "@/components/GHCollaboration";
import GHFooter from "@/components/GHFooter";

const Index = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <GHNavbar />
      <GHHero />
      <GHFeatures />
      <GHShowcase />
      <GHCustomers />
      <GHSecurity />
      <GHCollaboration />
      <GHFooter />
    </div>
  );
};

export default Index;
