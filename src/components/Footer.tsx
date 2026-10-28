/*
 * Footer Component
 * Copyright (c) 2026 kogulmurugaiah
 * All rights reserved.
 * 
 * Developer: kogulmurugaiah
 * Description: Footer component with copyright information
 */

const Footer = () => {
  return (
    <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/40 backdrop-blur-sm pb-28 md:pb-0">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-1">
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
            Copyright © 2026 CASHAM. All Rights Reserved.
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-500">
            Developed and maintained by Kogul Murugaiah
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
