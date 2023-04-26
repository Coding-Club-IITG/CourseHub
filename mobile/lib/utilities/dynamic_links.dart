import 'dart:developer';

import 'package:coursehub/main.dart';
import 'package:coursehub/providers/navigation_provider.dart';
import 'package:firebase_dynamic_links/firebase_dynamic_links.dart';
import 'package:provider/provider.dart';

class FirebaseDynamicLink {
  static Future<String> createDynamicLink(
      String title, String courseCode, String folderId) async {
    try {
      final dynamicLinkParams = DynamicLinkParameters(
        socialMetaTagParameters: SocialMetaTagParameters(
          title: title,
          imageUrl: Uri.parse(
              "https://ik.imagekit.io/4d3jgzelm/moto.png?updatedAt=1682109389548"),
        ),
        link: Uri.parse(
            "https://www.coursehubiitg.in/browse/${courseCode.toLowerCase()}/$folderId"),
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
    final PendingDynamicLinkData? initialLink =
        await FirebaseDynamicLinks.instance.getInitialLink();

    if (initialLink != null) {
      final Uri deepLink = initialLink.link;
       for (var element in deepLink.pathSegments) {
        log(element.toString());
      }
      log(deepLink.toString());
      // navigatorKey.currentContext
      //     ?.read<NavigationProvider>()
      //     .changePageNumber(1);
    }

    FirebaseDynamicLinks.instance.onLink.listen(
      (pendingDynamicLinkData) {
        // Set up the `onLink` event listener next as it may be received here
        final Uri deepLink = pendingDynamicLinkData.link;
        for (var element in deepLink.pathSegments) {
          log(element.toString());
        }
        // Example of using the dynamic link to push the user to a different screen
        // Navigator.pushNamed(context, deepLink.path);
        // navigatorKey.currentContext
        //     ?.read<NavigationProvider>()
        //     .changePageNumber(1);

        log('${deepLink}LISTENING TO DATA');
      },
    );
  }
}
