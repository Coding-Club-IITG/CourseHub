import 'package:flutter/material.dart';
import 'package:flutter_custom_tabs/flutter_custom_tabs.dart';

String fileSize(String fileSize) {
  double x = double.parse(fileSize);

  return x > 1
      ? "${x.toStringAsFixed(1)}MB"
      : "${(x * 1000).toStringAsFixed(1)}KB";
}

extension StringCasingExtension on String {
  String toCapitalized() =>
      length > 0 ? '${this[0].toUpperCase()}${substring(1).toLowerCase()}' : '';
  String toTitleCase() => replaceAll(RegExp(' +'), ' ')
      .split(' ')
      .map((str) => str.toCapitalized())
      .join(' ');
}

String letterCapitalizer(String c) {
  return c.toTitleCase();
}

Future<void> launchUrl(String url) async {
  await launch(
    url,
    customTabsOption: CustomTabsOption(
      animation: CustomTabsSystemAnimation.fade(),
      toolbarColor: Colors.black,
      showPageTitle: true,
      enableDefaultShare: false,
    ),
    safariVCOption: const SafariViewControllerOption(
        preferredBarTintColor: Colors.black,
        preferredControlTintColor: Colors.white),
  );
}

String? descriptionValidator(String? description) {
  if (description!.isEmpty) {
    return 'Please Enter a Description';
  } else {
    return null;
  }
}
