import 'package:flutter/material.dart';

import '../../constants/themes.dart';

class CCBranding extends StatelessWidget {
  const CCBranding({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          'by',
          style: Themes.theme.textTheme.bodySmall,
        ),
        const SizedBox(
          height: 10,
        ),
        Image.asset('assets/cc_logo.png'),
        const SizedBox(
          height: 20,
        ),
        RichText(
          textAlign: TextAlign.center,
          text: const TextSpan(children: [
            TextSpan(
              text: 'Coding Club\n',
              style: TextStyle(fontWeight: FontWeight.w700),
            ),
            TextSpan(
              text: 'IIT Guwahati',
              style: TextStyle(fontWeight: FontWeight.w400, fontSize: 12),
            )
          ]),
        )
      ],
    );
  }
}
