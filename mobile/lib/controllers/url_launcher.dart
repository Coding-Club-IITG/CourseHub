import 'package:flutter/material.dart';
import 'package:flutter_custom_tabs/flutter_custom_tabs.dart';

Future<void> launchUrl(String url) async {
  await launch(url,
      customTabsOption: CustomTabsOption(
        animation: CustomTabsSystemAnimation.fade(),
        toolbarColor: Colors.black,
        showPageTitle: true,
        enableDefaultShare: false,
      ),
      safariVCOption: const SafariViewControllerOption(
          preferredBarTintColor: Colors.black,
          preferredControlTintColor: Colors.white));
}
