import 'package:equatable/equatable.dart';

class UserProfile extends Equatable {
  const UserProfile({
    required this.displayName,
    this.bio,
    this.avatarUrl,
    this.coverUrl,
    this.city,
    this.country,
    this.phone,
  });

  final String displayName;
  final String? bio;
  final String? avatarUrl;
  final String? coverUrl;
  final String? city;
  final String? country;
  final String? phone;

  factory UserProfile.fromJson(Map<String, dynamic> j) => UserProfile(
        displayName: j['displayName'] as String? ?? '',
        bio: j['bio'] as String?,
        avatarUrl: j['avatarUrl'] as String?,
        coverUrl: j['coverUrl'] as String?,
        city: j['city'] as String?,
        country: j['country'] as String?,
        phone: j['phone'] as String?,
      );

  @override
  List<Object?> get props => [displayName, avatarUrl];
}

class BusinessSubscription extends Equatable {
  const BusinessSubscription({
    required this.id,
    required this.status,
    this.currentPeriodEnd,
  });

  final String id;
  final String status;
  final DateTime? currentPeriodEnd;

  factory BusinessSubscription.fromJson(Map<String, dynamic> j) => BusinessSubscription(
        id: j['id'] as String,
        status: j['status'] as String? ?? 'NONE',
        currentPeriodEnd: j['currentPeriodEnd'] != null
            ? DateTime.tryParse(j['currentPeriodEnd'].toString())
            : null,
      );

  bool get isActive {
    if (status != 'ACTIVE') return false;
    if (currentPeriodEnd != null && currentPeriodEnd!.isBefore(DateTime.now())) return false;
    return true;
  }

  @override
  List<Object?> get props => [id, status];
}

class User extends Equatable {
  const User({
    required this.id,
    required this.username,
    required this.role,
    this.email,
    this.profile,
    this.businessSubscription,
    this.business,
  });

  final String id;
  final String username;
  final String role;
  final String? email;
  final UserProfile? profile;
  final BusinessSubscription? businessSubscription;
  final Map<String, dynamic>? business;

  factory User.fromJson(Map<String, dynamic> j) => User(
        id: j['id'] as String,
        username: j['username'] as String,
        role: j['role'] as String? ?? 'USER',
        email: j['email'] as String?,
        profile: j['profile'] is Map
            ? UserProfile.fromJson(Map<String, dynamic>.from(j['profile'] as Map))
            : null,
        businessSubscription: j['businessSubscription'] is Map
            ? BusinessSubscription.fromJson(
                Map<String, dynamic>.from(j['businessSubscription'] as Map),
              )
            : null,
        business: j['business'] is Map ? Map<String, dynamic>.from(j['business'] as Map) : null,
      );

  bool get isBusiness => role == 'BUSINESS' || role == 'ADMIN';

  @override
  List<Object?> get props => [id, username, role];
}

class AuthSession {
  AuthSession({required this.user, required this.accessToken, required this.refreshToken});
  final User user;
  final String accessToken;
  final String refreshToken;

  factory AuthSession.fromJson(Map<String, dynamic> j) => AuthSession(
        user: User.fromJson(Map<String, dynamic>.from(j['user'] as Map)),
        accessToken: j['accessToken'] as String,
        refreshToken: j['refreshToken'] as String,
      );
}

class PostMedia {
  PostMedia({required this.id, required this.url, required this.type});
  final String id;
  final String url;
  final String type;

  factory PostMedia.fromJson(Map<String, dynamic> j) => PostMedia(
        id: j['id'] as String? ?? '',
        url: j['url'] as String? ?? '',
        type: j['type'] as String? ?? 'IMAGE',
      );
}

class PostItem {
  PostItem({
    required this.id,
    required this.author,
    this.content,
    this.media = const [],
    this.likeCount = 0,
    this.commentCount = 0,
    this.likedByMe = false,
    this.bookmarkedByMe = false,
    this.createdAt,
  });

  final String id;
  final User author;
  final String? content;
  final List<PostMedia> media;
  final int likeCount;
  final int commentCount;
  final bool likedByMe;
  final bool bookmarkedByMe;
  final DateTime? createdAt;

  factory PostItem.fromJson(Map<String, dynamic> j) {
    final authorMap = j['author'] is Map
        ? Map<String, dynamic>.from(j['author'] as Map)
        : <String, dynamic>{'id': '', 'username': 'user', 'role': 'USER'};
    return PostItem(
      id: j['id'] as String,
      author: User.fromJson(authorMap),
      content: j['content'] as String?,
      media: (j['media'] as List? ?? [])
          .map((e) => PostMedia.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList(),
      likeCount: (j['likeCount'] as num?)?.toInt() ?? 0,
      commentCount: (j['commentCount'] as num?)?.toInt() ??
          (j['_count'] is Map ? (j['_count']['comments'] as num?)?.toInt() : null) ??
          0,
      likedByMe: j['likedByMe'] as bool? ?? false,
      bookmarkedByMe: j['bookmarkedByMe'] as bool? ?? false,
      createdAt: j['createdAt'] != null ? DateTime.tryParse(j['createdAt'].toString()) : null,
    );
  }
}
