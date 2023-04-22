import 'package:coursehub/utilities/url_launcher.dart';
import 'package:coursehub/widgets/common/custom_snackbar.dart';
import 'package:coursehub/widgets/common/splash_on_pressed.dart';
import 'package:flutter/material.dart';

import 'package:flutter_svg/svg.dart';

class PhotoFrame extends StatelessWidget {
  final String photo;
  final Map<String, String> socials;
  const PhotoFrame({
    super.key,
    required this.socials,
    required this.photo,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 120,
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: Colors.transparent,
        border: Border.all(
          color: Colors.white,
          width: 1.12,
        ),
      ),
      child: Column(
        children: [
          Container(
            height: 120,
            decoration: BoxDecoration(
              border: Border.all(
                color: Colors.white,
                width: 1.12,
              ),
            ),
            child: Image.network(
              photo,
              fit: BoxFit.fill,
              errorBuilder: (context, error, stackTrace) => Image.asset(
                'assets/placeholder_dp.png',
              ),
            ),
          ),
          const SizedBox(
            height: 10,
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              SplashOnPressed(
                onPressed: () async {
                  await launchUrl(socials['github'] ?? '');
                },
                splashColor: Colors.grey,
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(vertical: 4, horizontal: 4),
                  child: SvgPicture.asset(
                    'assets/github.svg',
                    height: 16,
                  ),
                ),
              ),
              SplashOnPressed(
                onPressed: () async {
                  if (socials['instagram']!.isEmpty) {
                    showSnackBar(
                      'This guy is too busy to have an instagram handle 🤪 !',
                      context,
                    );
                    return;
                  }
                  await launchUrl(socials['instagram'] ?? '');
                },
                splashColor: Colors.grey,
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(vertical: 4, horizontal: 4),
                  child: SvgPicture.asset(
                    'assets/instagram.svg',
                    height: 16,
                  ),
                ),
              ),
              SplashOnPressed(
                onPressed: () async {
                  await launchUrl(socials['linkedin'] ?? '');
                },
                splashColor: Colors.grey,
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(vertical: 4, horizontal: 4),
                  child: SvgPicture.asset(
                    'assets/linkedin.svg',
                    height: 16,
                  ),
                ),
              )
            ],
          )
        ],
      ),
    );
  }
}
