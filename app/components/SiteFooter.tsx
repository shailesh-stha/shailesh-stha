import { Link } from "react-router";
import { profile } from "~/content/profile";
import { HashLink } from "./HashLink";

export function SiteFooter() {
  return (
    <footer className="site-footer site-footer--contained">
      <div className="site-footer__columns">
        <div className="site-footer__column">
          <h2 className="site-footer__title">Pages</h2>
          <ul>
            <li><HashLink to="/#work">Work</HashLink></li>
            <li><HashLink to="/#experience">Experience</HashLink></li>
            <li><Link to="/cv">CV</Link></li>
          </ul>
        </div>
        <div className="site-footer__column">
          <h2 className="site-footer__title">Elsewhere</h2>
          <ul>
            <li><a href={profile.links.github} target="_blank" rel="noopener noreferrer">GitHub<span className="sr-only"> (opens in a new tab)</span></a></li>
            <li><a href={profile.links.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn<span className="sr-only"> (opens in a new tab)</span></a></li>
          </ul>
        </div>
      </div>
      <div className="site-footer__legal">
        <p>&copy; {new Date().getFullYear()} {profile.name}</p>
        <nav aria-label="Legal">
          <ul>
            <li><Link to="/imprint">Imprint</Link></li>
            <li><Link to="/privacy">Privacy</Link></li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
