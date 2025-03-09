'use strict';

/**
 * Seed script to populate the database with initial data
 */

module.exports = {
  /**
   * Seed the database with initial data
   * @param {*} strapi Strapi instance
   */
  async seed(strapi) {
    try {
      // Create default languages
      const languages = [
        {
          name: 'English',
          code: 'en',
          isDefault: true,
          isActive: true,
          direction: 'ltr',
          dateFormat: 'MM/DD/YYYY',
          timeFormat: 'h:mm A'
        },
        {
          name: 'German',
          code: 'de',
          isDefault: false,
          isActive: true,
          direction: 'ltr',
          dateFormat: 'DD.MM.YYYY',
          timeFormat: 'HH:mm'
        }
      ];

      console.log('Creating default languages...');
      for (const language of languages) {
        const existingLanguage = await strapi.db.query('api::language.language').findOne({
          where: { code: language.code }
        });

        if (!existingLanguage) {
          await strapi.db.query('api::language.language').create({
            data: {
              ...language,
              publishedAt: new Date()
            }
          });
          console.log(`Language ${language.name} created.`);
        } else {
          console.log(`Language ${language.name} already exists.`);
        }
      }

      // Create default subscription plans
      const subscriptionPlans = [
        {
          name: 'Basic Plan',
          description: 'Basic plan for small restaurants',
          price: 9.99,
          planType: 'basic',
          maxMenuItems: 20,
          maxImages: 5,
          maxVideos: 0,
          allowAdditionalLanguages: false,
          allowCustomization: false,
          allowReviews: false,
          allowDiscounts: false,
          allowLiveChat: false,
          allowAdvancedReports: false,
          maxDescriptionLength: 200
        },
        {
          name: 'Normal Plan',
          description: 'Standard plan for medium-sized restaurants',
          price: 19.99,
          planType: 'normal',
          maxMenuItems: 50,
          maxImages: 20,
          maxVideos: 2,
          allowAdditionalLanguages: false,
          allowCustomization: false,
          allowReviews: true,
          allowDiscounts: true,
          allowLiveChat: false,
          allowAdvancedReports: false,
          maxDescriptionLength: 500
        },
        {
          name: 'Advanced Plan',
          description: 'Premium plan for large restaurants',
          price: 39.99,
          planType: 'advanced',
          maxMenuItems: 0, // Unlimited
          maxImages: 0, // Unlimited
          maxVideos: 0, // Unlimited
          allowAdditionalLanguages: true,
          allowCustomization: true,
          allowReviews: true,
          allowDiscounts: true,
          allowLiveChat: true,
          allowAdvancedReports: true,
          maxDescriptionLength: 0 // Unlimited
        }
      ];

      console.log('Creating default subscription plans...');
      for (const plan of subscriptionPlans) {
        const existingPlan = await strapi.db.query('api::subscription-plan.subscription-plan').findOne({
          where: { planType: plan.planType }
        });

        if (!existingPlan) {
          // Create for both languages
          const englishLocale = await strapi.db.query('plugin::i18n.locale').findOne({
            where: { code: 'en' }
          });
          
          const germanLocale = await strapi.db.query('plugin::i18n.locale').findOne({
            where: { code: 'de' }
          });

          if (englishLocale && germanLocale) {
            // Create in English
            const englishPlan = await strapi.db.query('api::subscription-plan.subscription-plan').create({
              data: {
                ...plan,
                locale: englishLocale.code,
                publishedAt: new Date()
              }
            });

            // Create in German with translated name and description
            const germanName = plan.name === 'Basic Plan' ? 'Basis-Plan' : 
                              plan.name === 'Normal Plan' ? 'Standard-Plan' : 'Premium-Plan';
            
            const germanDescription = plan.description === 'Basic plan for small restaurants' ? 'Basis-Plan für kleine Restaurants' :
                                    plan.description === 'Standard plan for medium-sized restaurants' ? 'Standard-Plan für mittelgroße Restaurants' :
                                    'Premium-Plan für große Restaurants';

            await strapi.db.query('api::subscription-plan.subscription-plan').create({
              data: {
                ...plan,
                name: germanName,
                description: germanDescription,
                locale: germanLocale.code,
                publishedAt: new Date(),
                localizations: [englishPlan.id]
              }
            });

            console.log(`Subscription plan ${plan.name} created in English and German.`);
          } else {
            console.log('Could not find English or German locale.');
          }
        } else {
          console.log(`Subscription plan ${plan.name} already exists.`);
        }
      }

      // Create default pages
      const pages = [
        {
          title: 'Home',
          slug: 'home',
          content: '<h1>Welcome to our Restaurant Platform</h1><p>Find the best restaurants in your area.</p>',
          isHomePage: true,
          pageType: 'standard'
        },
        {
          title: 'About Us',
          slug: 'about-us',
          content: '<h1>About Us</h1><p>We are a platform that connects restaurants with customers.</p>',
          isHomePage: false,
          pageType: 'standard'
        },
        {
          title: 'Contact Us',
          slug: 'contact-us',
          content: '<h1>Contact Us</h1><p>Get in touch with our team.</p>',
          isHomePage: false,
          pageType: 'standard'
        },
        {
          title: 'Terms and Conditions',
          slug: 'terms-and-conditions',
          content: '<h1>Terms and Conditions</h1><p>Please read our terms and conditions carefully.</p>',
          isHomePage: false,
          pageType: 'legal'
        },
        {
          title: 'Privacy Policy',
          slug: 'privacy-policy',
          content: '<h1>Privacy Policy</h1><p>Our privacy policy explains how we collect and use your data.</p>',
          isHomePage: false,
          pageType: 'legal'
        },
        {
          title: 'FAQ',
          slug: 'faq',
          content: '<h1>Frequently Asked Questions</h1><p>Find answers to common questions.</p>',
          isHomePage: false,
          pageType: 'faq'
        }
      ];

      console.log('Creating default pages...');
      for (const page of pages) {
        const existingPage = await strapi.db.query('api::page.page').findOne({
          where: { slug: page.slug }
        });

        if (!existingPage) {
          // Create for both languages
          const englishLocale = await strapi.db.query('plugin::i18n.locale').findOne({
            where: { code: 'en' }
          });
          
          const germanLocale = await strapi.db.query('plugin::i18n.locale').findOne({
            where: { code: 'de' }
          });

          if (englishLocale && germanLocale) {
            // Create in English
            const englishPage = await strapi.db.query('api::page.page').create({
              data: {
                ...page,
                locale: englishLocale.code,
                publishedAt: new Date()
              }
            });

            // Create in German with translated title and content
            const germanTitle = page.title === 'Home' ? 'Startseite' : 
                              page.title === 'About Us' ? 'Über uns' : 
                              page.title === 'Contact Us' ? 'Kontakt' :
                              page.title === 'Terms and Conditions' ? 'Allgemeine Geschäftsbedingungen' :
                              page.title === 'Privacy Policy' ? 'Datenschutzrichtlinie' : 'Häufig gestellte Fragen';
            
            const germanContent = page.title === 'Home' ? '<h1>Willkommen auf unserer Restaurant-Plattform</h1><p>Finden Sie die besten Restaurants in Ihrer Nähe.</p>' :
                                page.title === 'About Us' ? '<h1>Über uns</h1><p>Wir sind eine Plattform, die Restaurants mit Kunden verbindet.</p>' :
                                page.title === 'Contact Us' ? '<h1>Kontakt</h1><p>Nehmen Sie Kontakt mit unserem Team auf.</p>' :
                                page.title === 'Terms and Conditions' ? '<h1>Allgemeine Geschäftsbedingungen</h1><p>Bitte lesen Sie unsere Allgemeinen Geschäftsbedingungen sorgfältig durch.</p>' :
                                page.title === 'Privacy Policy' ? '<h1>Datenschutzrichtlinie</h1><p>Unsere Datenschutzrichtlinie erklärt, wie wir Ihre Daten sammeln und verwenden.</p>' :
                                '<h1>Häufig gestellte Fragen</h1><p>Finden Sie Antworten auf häufig gestellte Fragen.</p>';

            await strapi.db.query('api::page.page').create({
              data: {
                ...page,
                title: germanTitle,
                content: germanContent,
                locale: germanLocale.code,
                publishedAt: new Date(),
                localizations: [englishPage.id]
              }
            });

            console.log(`Page ${page.title} created in English and German.`);
          } else {
            console.log('Could not find English or German locale.');
          }
        } else {
          console.log(`Page ${page.title} already exists.`);
        }
      }

      console.log('Seed completed successfully!');
    } catch (error) {
      console.error('Seed error:', error);
    }
  }
};
