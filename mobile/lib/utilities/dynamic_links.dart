import 'dart:developer';

import '../database/cache_store.dart';
import '../../main.dart';
import '../providers/navigation_provider.dart';
import 'package:firebase_dynamic_links/firebase_dynamic_links.dart';
import 'package:provider/provider.dart';

import '../apis/courses/add_courses.dart';

class FirebaseDynamicLink {
  static Future<String> createDynamicLink(
    String title,
    String id,
    String address,
  ) async {
    String newPath = '';
    String x =
        CacheStore.browsePath.substring(0, CacheStore.browsePath.length - 1);

    newPath += address.split(' ')[0];

    for (var i = 1; i < address.split('/').length; i++) {
      newPath += '/';
      newPath += address.split('/')[i];
    }
    newPath += x.split('/').last;

    final currCourse = await CacheStore.getBrowsedCourse();

    try {
      final dynamicLinkParams = DynamicLinkParameters(
        socialMetaTagParameters: SocialMetaTagParameters(
          title: title,
          imageUrl: Uri.parse(
              "https://ik.imagekit.io/4d3jgzelm/moto.png?updatedAt=1682109389548"),
        ),
        link: Uri.parse(
            "https://www.coursehubiitg.in/browse/$currCourse/$id?path=$address"),
        uriPrefix: "https://coursehubiitg.page.link",
        androidParameters: const AndroidParameters(
          packageName: "com.codingclub.coursehub",
        ),
        iosParameters: const IOSParameters(
          bundleId: "com.codingclub.coursehub",
          appStoreId: '6447286863',
        ),
      );
      final dynamicLink =
          await FirebaseDynamicLinks.instance.buildShortLink(dynamicLinkParams);

      return dynamicLink.shortUrl.toString();
    } catch (e) {
      rethrow;
    }
  }

  static Future<void> handleInitialLink() async {
    final navigationProvider =
        navigatorKey.currentContext?.read<NavigationProvider>();

    final PendingDynamicLinkData? initialLink =
        await FirebaseDynamicLinks.instance.getInitialLink();

    if (initialLink != null) {
      final Uri deepLink = initialLink.link;
      // await navigateToFile(deepLink.pathSegments[1]);
      navigationProvider?.changePageNumber(2);
      log(deepLink.toString());
    }

    FirebaseDynamicLinks.instance.onLink.listen(
      (pendingDynamicLinkData) async {
        // Set up the `onLink` event listener next as it may be received here
        final Uri deepLink = pendingDynamicLinkData.link;
        navigationProvider?.changePageNumber(2);
        log(deepLink.toString());

        // await navigateToFile(deepLink.pathSegments[1]);
      },
    );
  }

  static Future<void> navigateToFile(String code) async {
    final navigationProvider =
        navigatorKey.currentState!.context.read<NavigationProvider>();
    await getUserCourses(code.toLowerCase(), isTempCourse: true);
    CacheStore.isTempCourse = true;
    CacheStore.resetBrowsePath();
    navigationProvider.changePageNumber(1);
  }
}
