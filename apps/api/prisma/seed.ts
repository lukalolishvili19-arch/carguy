import { PrismaClient, Role, BadgeTier, ServiceCategory, PostType, PostVisibility, MediaType } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding CarGuy database...');

  // ---------- Admin user ----------
  const adminPassword = await argon2.hash('Admin123!');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@carguy.app' },
    update: {},
    create: {
      email: 'admin@carguy.app',
      username: 'admin',
      passwordHash: adminPassword,
      role: Role.ADMIN,
      emailVerified: true,
      profile: {
        create: { displayName: 'CarGuy Admin', locale: 'en' },
      },
      reputation: { create: { xp: 9999, level: 50 } },
    },
  });
  console.log(`✔ Admin: ${admin.email} (password: Admin123!)`);

  // ---------- Demo user ----------
  const userPassword = await argon2.hash('User123!');
  await prisma.user.upsert({
    where: { email: 'user@carguy.app' },
    update: {},
    create: {
      email: 'user@carguy.app',
      username: 'carfan',
      passwordHash: userPassword,
      role: Role.USER,
      emailVerified: true,
      profile: {
        create: {
          displayName: 'Car Fan',
          locale: 'en',
          favoriteBrands: ['BMW', 'Toyota'],
        },
      },
      reputation: { create: {} },
    },
  });
  console.log('✔ Demo user: user@carguy.app (password: User123!)');

  // ---------- Badges ----------
  const badges = [
    { key: 'welcome', name: 'Welcome Aboard', description: 'Joined CarGuy', tier: BadgeTier.BRONZE, icon: '🚗' },
    { key: 'first_post', name: 'First Gear', description: 'Published your first post', tier: BadgeTier.BRONZE, icon: '✍️' },
    { key: 'popular', name: 'Crowd Favorite', description: 'Reached 100 likes on a post', tier: BadgeTier.SILVER, icon: '❤️' },
    { key: 'mechanic', name: 'Verified Mechanic', description: 'Verified professional mechanic', tier: BadgeTier.GOLD, icon: '🔧' },
    { key: 'business', name: 'Verified Business', description: 'Verified business account', tier: BadgeTier.GOLD, icon: '🏢' },
    { key: 'top_contributor', name: 'Top Contributor', description: 'Top of the leaderboard', tier: BadgeTier.PLATINUM, icon: '🏆' },
    { key: 'moderator', name: 'Guardian', description: 'Community moderator', tier: BadgeTier.SPECIAL, icon: '🛡️' },
  ];
  for (const b of badges) {
    await prisma.badge.upsert({ where: { key: b.key }, update: b, create: b });
  }
  console.log(`✔ Badges: ${badges.length}`);

  // ---------- Achievements ----------
  const achievements = [
    { key: 'social_butterfly', name: 'Social Butterfly', description: 'Follow 10 people', xpReward: 50, icon: '🦋' },
    { key: 'garage_owner', name: 'Garage Owner', description: 'Add your first vehicle', xpReward: 30, icon: '🏠' },
    { key: 'reviewer', name: 'Honest Reviewer', description: 'Write 5 reviews', xpReward: 80, icon: '⭐' },
    { key: 'dealmaker', name: 'Dealmaker', description: 'Post your first marketplace listing', xpReward: 40, icon: '🤝' },
    { key: 'helper', name: 'Community Helper', description: 'Get a best answer in the forum', xpReward: 100, icon: '💡' },
  ];
  for (const a of achievements) {
    await prisma.achievement.upsert({ where: { key: a.key }, update: a, create: a });
  }
  console.log(`✔ Achievements: ${achievements.length}`);

  // ---------- Forum categories ----------
  const forumCategories = [
    { name: 'General Discussion', slug: 'general', description: 'Anything automotive', icon: '💬', order: 1 },
    { name: 'Maintenance & Repair', slug: 'maintenance', description: 'DIY, troubleshooting, help', icon: '🔧', order: 2 },
    { name: 'Builds & Projects', slug: 'builds', description: 'Show off your build', icon: '🏗️', order: 3 },
    { name: 'Buying & Selling', slug: 'buy-sell', description: 'Advice on deals', icon: '💰', order: 4 },
    { name: 'Motorsport', slug: 'motorsport', description: 'Racing, track days, F1', icon: '🏁', order: 5 },
    { name: 'EV & Hybrid', slug: 'ev', description: 'Electric future', icon: '⚡', order: 6 },
  ];
  for (const c of forumCategories) {
    await prisma.forumCategory.upsert({ where: { slug: c.slug }, update: c, create: c });
  }
  console.log(`✔ Forum categories: ${forumCategories.length}`);

  // ---------- News categories ----------
  const newsCategories = [
    'New Cars', 'Electric Vehicles', 'Motorsports', 'Formula 1', 'Rally', 'MotoGP',
    'Technology', 'Maintenance', 'Safety', 'Fuel Prices', 'Regulations', 'Local', 'International',
  ];
  for (const name of newsCategories) {
    const slug = name.toLowerCase().replace(/\s+/g, '-');
    await prisma.newsCategory.upsert({ where: { slug }, update: { name }, create: { name, slug } });
  }
  console.log(`✔ News categories: ${newsCategories.length}`);

  // ---------- Insurance companies & plans ----------
  const insurers = [
    { name: 'TBC Insurance', slug: 'tbc-insurance' },
    { name: 'Aldagi', slug: 'aldagi' },
    { name: 'GPI Holding', slug: 'gpi-holding' },
  ];
  for (const ins of insurers) {
    const company = await prisma.insuranceCompany.upsert({
      where: { slug: ins.slug },
      update: {},
      create: { ...ins, ratingAvg: 4.3 },
    });
    const existingPlans = await prisma.insurancePlan.count({ where: { companyId: company.id } });
    if (existingPlans === 0) {
      await prisma.insurancePlan.create({
        data: {
          companyId: company.id,
          name: 'Basic Cover',
          description: 'Third-party liability essentials',
          monthlyPrice: 25,
          yearlyPrice: 270,
          coverages: {
            create: [
              { title: 'Third-party liability', included: true },
              { title: 'Roadside assistance', included: true },
              { title: 'Theft protection', included: false },
            ],
          },
        },
      });
      await prisma.insurancePlan.create({
        data: {
          companyId: company.id,
          name: 'Full Cover',
          description: 'Comprehensive protection',
          monthlyPrice: 60,
          yearlyPrice: 650,
          coverages: {
            create: [
              { title: 'Third-party liability', included: true },
              { title: 'Collision (CASCO)', included: true },
              { title: 'Theft protection', included: true },
              { title: 'Roadside assistance', included: true },
              { title: 'Glass coverage', included: true },
            ],
          },
        },
      });
    }
  }
  console.log(`✔ Insurance companies: ${insurers.length}`);

  // ---------- Demo business ----------
  const bizPassword = await argon2.hash('Business123!');
  const bizOwner = await prisma.user.upsert({
    where: { email: 'shop@carguy.app' },
    update: {},
    create: {
      email: 'shop@carguy.app',
      username: 'protuning',
      passwordHash: bizPassword,
      role: Role.BUSINESS,
      emailVerified: true,
      profile: { create: { displayName: 'Pro Tuning Garage', locale: 'en' } },
      reputation: { create: {} },
    },
  });
  await prisma.business.upsert({
    where: { slug: 'pro-tuning-garage' },
    update: {},
    create: {
      ownerId: bizOwner.id,
      name: 'Pro Tuning Garage',
      slug: 'pro-tuning-garage',
      description: 'Performance tuning, diagnostics and full service.',
      category: ServiceCategory.TUNING,
      phone: '+995555000111',
      city: 'Tbilisi',
      country: 'Georgia',
      latitude: 41.7151,
      longitude: 44.8271,
      services: {
        create: [
          { name: 'ECU Remap', category: ServiceCategory.TUNING, priceFrom: 200, durationMin: 120 },
          { name: 'Full Diagnostics', category: ServiceCategory.DIAGNOSTICS, priceFrom: 40, durationMin: 60 },
          { name: 'Oil Change', category: ServiceCategory.OIL_CHANGE, priceFrom: 30, durationMin: 45 },
        ],
      },
    },
  });
  console.log('✔ Demo business: shop@carguy.app (password: Business123!)');

  // ---------- Test accounts (demo / QA) ----------
  const test1Hash = await argon2.hash('123');
  const test1 = await prisma.user.upsert({
    where: { email: 'test1@test.ge' },
    update: { passwordHash: test1Hash, username: 'test1', emailVerified: true, isActive: true },
    create: {
      email: 'test1@test.ge',
      username: 'test1',
      passwordHash: test1Hash,
      role: Role.USER,
      emailVerified: true,
      profile: {
        create: {
          displayName: 'Test Driver 1',
          locale: 'ka',
          bio: 'სატესტო ანგარიში — BMW E46',
          favoriteBrands: ['BMW', 'Mercedes'],
        },
      },
      reputation: { create: { xp: 120, level: 3 } },
    },
  });

  const test2Hash = await argon2.hash('1234');
  const test2 = await prisma.user.upsert({
    where: { email: 'test2@test.ge' },
    update: { passwordHash: test2Hash, username: 'test2', emailVerified: true, isActive: true },
    create: {
      email: 'test2@test.ge',
      username: 'test2',
      passwordHash: test2Hash,
      role: Role.USER,
      emailVerified: true,
      profile: {
        create: {
          displayName: 'Test Driver 2',
          locale: 'ka',
          bio: 'სატესტო ანგარიში — Toyota Supra',
          favoriteBrands: ['Toyota', 'Nissan'],
        },
      },
      reputation: { create: { xp: 80, level: 2 } },
    },
  });
  console.log('✔ Test users: test1 / 123  and  test2 / 1234  (also test1@test.ge, test2@test.ge)');

  // Mutual follow so personalized /posts/feed shows both users' posts
  await prisma.follow.upsert({
    where: { followerId_followingId: { followerId: test1.id, followingId: test2.id } },
    update: {},
    create: { followerId: test1.id, followingId: test2.id },
  });
  await prisma.follow.upsert({
    where: { followerId_followingId: { followerId: test2.id, followingId: test1.id } },
    update: {},
    create: { followerId: test2.id, followingId: test1.id },
  });
  console.log('✔ test1 ↔ test2 follow each other');

  // ---------- Sample feed posts ----------
  const existingDemoPosts = await prisma.post.count({
    where: { authorId: { in: [test1.id, test2.id] } },
  });
  if (existingDemoPosts === 0) {
    const samplePosts = [
      {
        authorId: test1.id,
        type: PostType.PHOTO,
        content: 'ახალი E46 — პირველი სეანსი ვაზისუბანში 🔥 #bmw #e46 #tbilisi',
        location: 'Tbilisi, Georgia',
        likeCount: 42,
        commentCount: 5,
        mediaUrl: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=1200&q=80',
      },
      {
        authorId: test1.id,
        type: PostType.MAINTENANCE_TIP,
        content: 'ზეთის გამოცვლა ყოველ 8–10 ათას კმ-ზე. სინთეტიკა უკეთესია ტურბოზე.',
        location: 'Batumi',
        likeCount: 18,
        commentCount: 3,
        mediaUrl: 'https://images.unsplash.com/photo-1486262715619-67b246e2c101?w=1200&q=80',
      },
      {
        authorId: test2.id,
        type: PostType.CAR_BUILD,
        content: 'Supra A90 build log — exhaust + intake დღეს დავამონტაჟე 🚗💨',
        location: 'Tbilisi',
        likeCount: 67,
        commentCount: 12,
        mediaUrl: 'https://images.unsplash.com/photo-1542362567-b07e54389859?w=1200&q=80',
      },
      {
        authorId: test2.id,
        type: PostType.PHOTO,
        content: 'Night drive — Rustaveli Avenue ✨ #carguy #georgia',
        location: 'Rustaveli, Tbilisi',
        likeCount: 31,
        commentCount: 4,
        mediaUrl: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1200&q=80',
      },
      {
        authorId: test1.id,
        type: PostType.QUESTION,
        content: 'რომელი სერვისი გირჩევთ Tbilisi-ში suspension-ისთვის? რეკომენდაციები მინდა.',
        location: null,
        likeCount: 9,
        commentCount: 7,
        mediaUrl: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&q=60',
      },
    ];

    for (const p of samplePosts) {
      await prisma.post.create({
        data: {
          authorId: p.authorId,
          type: p.type,
          visibility: PostVisibility.PUBLIC,
          content: p.content,
          location: p.location,
          likeCount: p.likeCount,
          commentCount: p.commentCount,
          media: {
            create: [
              {
                url: p.mediaUrl,
                type: MediaType.IMAGE,
                order: 0,
                width: 1200,
                height: 800,
              },
            ],
          },
        },
      });
    }
    console.log(`✔ Sample posts: ${samplePosts.length}`);
  } else {
    console.log(`✔ Sample posts already exist (${existingDemoPosts}), skipped`);
  }

  // ---------- Sample stories (24h) ----------
  const storyAuthors = [test1.id, test2.id, admin.id];
  const demoUser = await prisma.user.findUnique({ where: { email: 'user@carguy.app' } });
  if (demoUser) storyAuthors.push(demoUser.id);

  await prisma.story.deleteMany({
    where: { authorId: { in: storyAuthors } },
  });
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const sampleStories = [
    {
      authorId: test1.id,
      mediaUrl: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&q=80',
      caption: 'E46 morning ☀️',
    },
    {
      authorId: test1.id,
      mediaUrl: 'https://images.unsplash.com/photo-1486262715619-67b246e2c101?w=800&q=80',
      caption: 'Garage day 🔧',
    },
    {
      authorId: test1.id,
      mediaUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80',
      caption: 'Weekend wash',
    },
    {
      authorId: test2.id,
      mediaUrl: 'https://images.unsplash.com/photo-1542362567-b07e54389859?w=800&q=80',
      caption: 'Supra night 🚗',
    },
    {
      authorId: test2.id,
      mediaUrl: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&q=80',
      caption: 'City cruise',
    },
    {
      authorId: test2.id,
      mediaUrl: 'https://images.unsplash.com/photo-1617531653332-bd46c24f2068?w=800&q=80',
      caption: 'Track day prep',
    },
    {
      authorId: admin.id,
      mediaUrl: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800&q=80',
      caption: 'CarGuy tip of the day',
    },
    {
      authorId: admin.id,
      mediaUrl: 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=800&q=80',
      caption: 'New feature drop 🚀',
    },
    ...(demoUser
      ? [
          {
            authorId: demoUser.id,
            mediaUrl: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800&q=80',
            caption: 'BMW life',
          },
          {
            authorId: demoUser.id,
            mediaUrl: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800&q=80',
            caption: 'Sunday drive',
          },
        ]
      : []),
  ];
  for (const s of sampleStories) {
    await prisma.story.create({
      data: {
        authorId: s.authorId,
        mediaUrl: s.mediaUrl,
        type: MediaType.IMAGE,
        caption: s.caption,
        expiresAt,
      },
    });
  }
  console.log(`✔ Sample stories: ${sampleStories.length} (${new Set(sampleStories.map((s) => s.authorId)).size} authors)`);

  console.log('✅ Seed complete.');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
