/**
 * Seed script to populate Resources table with OpenStax textbooks
 * Run: npx ts-node prisma/seed.ts (or node prisma/seed.js if using JS)
 *
 * OpenStax provides free, peer-reviewed, openly licensed textbooks
 * License: CC BY 4.0 (Creative Commons Attribution 4.0)
 */

const prisma = require('../src/prisma');

const OPENSTAX_RESOURCES = [
  {
    title: 'Calculus Volume 1',
    author: 'Gilbert Strang, Edwin "Jed" Herman',
    description: 'Calculus is designed for the typical two- or three-semester general calculus course, incorporating innovative features to enhance student learning. The book guides students through the core concepts of calculus and helps them understand how those concepts apply to their lives and the world around them.',
    subject: 'Mathematics',
    category: 'Book',
    grade: ['College'],
    tags: ['Calculus', 'Derivatives', 'Integrals', 'Limits', 'College'],
    fileUrl: 'https://d3bxy9ebuduird.cloudfront.net/oscms-prodcms/media/documents/Calculus_Volume_1-WEB.pdf',
    fileType: 'application/pdf',
    source: 'OpenStax',
    license: 'CC BY 4.0',
    isbn: '978-1-947172-13-5',
    publishedYear: 2016
  },
  {
    title: 'Calculus Volume 2',
    author: 'Gilbert Strang, Edwin "Jed" Herman',
    description: 'Calculus Volume 2 is designed for the typical two- or three-semester general calculus course. The book continues where Volume 1 ends, covering integration, differential equations, sequences and series, and parametric equations.',
    subject: 'Mathematics',
    category: 'Book',
    grade: ['College'],
    tags: ['Calculus', 'Integration', 'Sequences', 'Series', 'College'],
    fileUrl: 'https://d3bxy9ebuduird.cloudfront.net/oscms-prodcms/media/documents/Calculus_Volume_2-WEB.pdf',
    fileType: 'application/pdf',
    source: 'OpenStax',
    license: 'CC BY 4.0',
    isbn: '978-1-947172-14-2',
    publishedYear: 2016
  },
  {
    title: 'Calculus Volume 3',
    author: 'Gilbert Strang, Edwin "Jed" Herman',
    description: 'Calculus Volume 3 covers parametric equations and polar coordinates, vectors, functions of several variables, multiple integration, and second-order differential equations.',
    subject: 'Mathematics',
    category: 'Book',
    grade: ['College'],
    tags: ['Calculus', 'Vectors', 'Multivariable', 'College'],
    fileUrl: 'https://d3bxy9ebuduird.cloudfront.net/oscms-prodcms/media/documents/Calculus_Volume_3-WEB.pdf',
    fileType: 'application/pdf',
    source: 'OpenStax',
    license: 'CC BY 4.0',
    isbn: '978-1-947172-15-9',
    publishedYear: 2016
  },
  {
    title: 'Precalculus',
    author: 'Jay Abramson',
    description: 'Precalculus is adapted from the Openstax College Algebra and Precalculus courseware. The material is organized by clearly defined learning objectives, and includes worked examples that demonstrate problem-solving approaches in an accessible way.',
    subject: 'Mathematics',
    category: 'Book',
    grade: ['High School', 'College'],
    tags: ['Precalculus', 'Algebra', 'Trigonometry', 'High School'],
    fileUrl: 'https://d3bxy9ebuduird.cloudfront.net/oscms-prodcms/media/documents/Precalculus-WEB.pdf',
    fileType: 'application/pdf',
    source: 'OpenStax',
    license: 'CC BY 4.0',
    isbn: '978-1-947172-06-7',
    publishedYear: 2015
  },
  {
    title: 'College Algebra',
    author: 'Jay Abramson',
    description: 'College Algebra is an introductory text for a one-semester course in college algebra. It is designed for students to succeed in this course and in subsequent mathematics courses. Throughout the book, theory and applications are balanced with an emphasis on problem-solving.',
    subject: 'Mathematics',
    category: 'Book',
    grade: ['College'],
    tags: ['Algebra', 'Equations', 'Functions', 'College'],
    fileUrl: 'https://d3bxy9ebuduird.cloudfront.net/oscms-prodcms/media/documents/CollegeAlgebra-WEB_version-2022-11-22.pdf',
    fileType: 'application/pdf',
    source: 'OpenStax',
    license: 'CC BY 4.0',
    isbn: '978-1-938168-29-7',
    publishedYear: 2021
  },
  {
    title: 'Biology 2e',
    author: 'Mariëlle Hoefnagels',
    description: 'Biology 2e is designed to cover the scope and sequence requirements of a typical two-semester Biology course for science majors, pre-med students, and other students taking upper-level science courses.',
    subject: 'Biology',
    category: 'Book',
    grade: ['College'],
    tags: ['Biology', 'Cells', 'Evolution', 'Genetics', 'College'],
    fileUrl: 'https://d3bxy9ebuduird.cloudfront.net/oscms-prodcms/media/documents/Biology_2e-WEB.pdf',
    fileType: 'application/pdf',
    source: 'OpenStax',
    license: 'CC BY 4.0',
    isbn: '978-1-947172-31-9',
    publishedYear: 2018
  },
  {
    title: 'General Chemistry 1 & 2',
    author: 'OpenStax',
    description: 'General Chemistry is designed for a two-semester introductory course. The book provides an important opportunity for students to learn the core concepts of chemistry and understand how those concepts apply to their lives and the world around them.',
    subject: 'Chemistry',
    category: 'Book',
    grade: ['College'],
    tags: ['Chemistry', 'Atoms', 'Bonds', 'Reactions', 'College'],
    fileUrl: 'https://d3bxy9ebuduird.cloudfront.net/oscms-prodcms/media/documents/GeneralChemistry1and2-WEB.pdf',
    fileType: 'application/pdf',
    source: 'OpenStax',
    license: 'CC BY 4.0',
    isbn: '978-1-947172-39-5',
    publishedYear: 2018
  },
  {
    title: 'Physics: College Physics',
    author: 'Paul Peter Urone, Roger Hinrichs',
    description: 'College Physics is designed for a one-year introductory course. The text is grounded in real-world examples to help students connect physics to everyday life and engage with the material.',
    subject: 'Physics',
    category: 'Book',
    grade: ['College'],
    tags: ['Physics', 'Mechanics', 'Waves', 'Thermodynamics', 'College'],
    fileUrl: 'https://d3bxy9ebuduird.cloudfront.net/oscms-prodcms/media/documents/CollegePhysics-WEB.pdf',
    fileType: 'application/pdf',
    source: 'OpenStax',
    license: 'CC BY 4.0',
    isbn: '978-1-947172-21-0',
    publishedYear: 2017
  },
  {
    title: 'U.S. History',
    author: 'P. Scott Corbett, et al.',
    description: 'U.S. History is designed for a two-semester American history course. It is traditional in coverage, following a roughly chronological pattern, while being thematic in its emphasis on race, region, class, and gender.',
    subject: 'History',
    category: 'Book',
    grade: ['High School', 'College'],
    tags: ['American History', 'US Government', 'Society'],
    fileUrl: 'https://d3bxy9ebuduird.cloudfront.net/oscms-prodcms/media/documents/U.S.History2e-WEB-FINAL.pdf',
    fileType: 'application/pdf',
    source: 'OpenStax',
    license: 'CC BY 4.0',
    isbn: '978-1-947172-17-3',
    publishedYear: 2017
  },
  {
    title: 'American Government 3e',
    author: 'Glen Krutz, Sylvie Waskiewicz',
    description: 'American Government is designed for a one-semester introductory course on American politics and government. It is traditional in approach and introduces students to the main ideas of American government and politics.',
    subject: 'Government',
    category: 'Book',
    grade: ['High School', 'College'],
    tags: ['Government', 'Civics', 'Politics', 'Constitutional Law'],
    fileUrl: 'https://d3bxy9ebuduird.cloudfront.net/oscms-prodcms/media/documents/AmericanGovernment3e-WEB.pdf',
    fileType: 'application/pdf',
    source: 'OpenStax',
    license: 'CC BY 4.0',
    isbn: '978-1-947172-70-8',
    publishedYear: 2021
  },
  {
    title: 'Principles of Microeconomics 3e',
    author: 'Steven A. Greenlaw, David Shapiro',
    description: 'Principles of Microeconomics 3e covers the scope and sequence of most introductory microeconomics courses. The authors take a balanced approach to micro and macro economics, to both Keynesian and classical views.',
    subject: 'Economics',
    category: 'Book',
    grade: ['College'],
    tags: ['Economics', 'Microeconomics', 'Supply', 'Demand'],
    fileUrl: 'https://d3bxy9ebuduird.cloudfront.net/oscms-prodcms/media/documents/PrinciplesofMicroeconomics3e-WEB.pdf',
    fileType: 'application/pdf',
    source: 'OpenStax',
    license: 'CC BY 4.0',
    isbn: '978-1-951693-41-2',
    publishedYear: 2021
  },
  {
    title: 'World History Volume 1: to 1500',
    author: 'OpenStax',
    description: 'World History Volume 1: to 1500 is a traditional text that explores the development of human societies, with special attention to the way different peoples and places have exchanged goods and ideas.',
    subject: 'History',
    category: 'Book',
    grade: ['High School', 'College'],
    tags: ['World History', 'Ancient History', 'Medieval'],
    fileUrl: 'https://d3bxy9ebuduird.cloudfront.net/oscms-prodcms/media/documents/WorldHistory_Vol1-WEB.pdf',
    fileType: 'application/pdf',
    source: 'OpenStax',
    license: 'CC BY 4.0',
    isbn: '978-1-947172-10-4',
    publishedYear: 2016
  }
];

async function main() {
  console.log('🌱 Starting resource seeding...');

  try {
    // Clear existing resources (optional - comment out if you want to keep them)
    // const deleted = await prisma.resource.deleteMany({});
    // console.log(`Cleared ${deleted.count} existing resources`);

    let createdCount = 0;
    let skippedCount = 0;

    for (const resource of OPENSTAX_RESOURCES) {
      try {
        // Check if resource already exists by title
        const existing = await prisma.resource.findFirst({
          where: { title: resource.title }
        });

        if (existing) {
          console.log(`⏭️  Skipped: "${resource.title}" (already exists)`);
          skippedCount++;
          continue;
        }

        // Create resource with tags
        const created = await prisma.resource.create({
          data: {
            title: resource.title,
            author: resource.author,
            description: resource.description,
            subject: resource.subject,
            category: resource.category,
            grade: resource.grade,
            fileUrl: resource.fileUrl,
            fileType: resource.fileType,
            source: resource.source,
            license: resource.license,
            isbn: resource.isbn,
            publishedYear: resource.publishedYear,
            isActive: true,
            downloadCount: 0,
            tags: {
              create: resource.tags.map(tag => ({ name: tag }))
            }
          },
          include: { tags: true }
        });

        console.log(`✅ Created: "${created.title}" (${resource.source})`);
        createdCount++;
      } catch (error) {
        console.error(`❌ Error creating "${resource.title}":`, error.message);
      }
    }

    console.log('\n📊 Seeding Summary:');
    console.log(`✅ Created: ${createdCount} resources`);
    console.log(`⏭️  Skipped: ${skippedCount} resources (already exist)`);
    console.log(`📚 Total resources now in database: ${createdCount + skippedCount}`);
    console.log('\n✨ Resource seeding completed!');
  } catch (error) {
    console.error('💥 Seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
