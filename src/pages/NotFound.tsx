import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import Navbar from "@/components/careers/Navbar";
import Footer from "@/components/careers/Footer";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main id="main" className="flex min-h-[60vh] items-center justify-center px-4 pt-24 pb-16">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">404</p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
            This page took a different career path
          </h1>
          <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-muted-foreground">
            The page you're looking for doesn't exist or has moved. Let's get you
            back to exploring opportunities at Lumofy.
          </p>
          <div className="mt-8">
            <Button asChild size="lg" className="h-12 rounded-xl px-8 text-base">
              <Link to="/">
                <Compass className="mr-2 h-4 w-4" aria-hidden="true" />
                Back to careers
              </Link>
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default NotFound;
