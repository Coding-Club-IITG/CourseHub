import 'package:coursehub/utilities/helpers/helpers.dart';

import '../../constants/themes.dart';
import '../../widgets/common/custom_snackbar.dart';
import 'package:flutter/material.dart';
import 'package:flutter_svg/svg.dart';

import '../../widgets/common/splash_on_pressed.dart';

class PhotoFrame extends StatelessWidget {
  final String photo;
  final Map<String, String> socials;
  final String name;
  const PhotoFrame(
      {super.key,
      required this.socials,
      required this.photo,
      required this.name});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 140,
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
            width: 120,
            height: 150,
            decoration: BoxDecoration(
              border: Border.all(
                color: Colors.white,
                width: 1.12,
              ),
            ),
            child: Image.network(
              photo,
              fit: BoxFit.cover,
              loadingBuilder: (context, child, loadingProgress) {
                if (loadingProgress == null) return child;
                return const Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    SizedBox(
                      height: 30,
                    ),
                    LinearProgressIndicator(
                      color: Themes.kYellow,
                      backgroundColor: Colors.black,
                    ),
                    SizedBox(
                      height: 10,
                    ),
                    Text(
                      'Loading us! 😜 ',
                      textAlign: TextAlign.center,
                      style:
                          TextStyle(fontSize: 12, fontWeight: FontWeight.w400),
                    ),
                  ],
                );
              },
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
                  if (socials['github']!.isEmpty) {
                    showSnackBar(
                      'This guy is not so geeky to have a github account 🤪!',
                      context,
                    );
                    return;
                  }
                  await launchUrl(socials['github'] ?? '');
                },
                splashColor: Colors.grey,
                child: SvgPicture.asset(
                  'assets/github.svg',
                  height: 16,
                ),
              ),
              SplashOnPressed(
                onPressed: () async {
                  if (socials['instagram']!.isEmpty) {
                    showSnackBar(
                      'This guy is too busy to have an instagram handle 🤪!',
                      context,
                    );
                    return;
                  }
                  await launchUrl(socials['instagram'] ?? '');
                },
                splashColor: Colors.grey,
                child: SvgPicture.asset(
                  name.toLowerCase() == 'kuldeep ranjan'
                      ? 'assets/medium.svg'
                      : 'assets/instagram.svg',
                  height: 16,
                ),
              ),
              SplashOnPressed(
                onPressed: () async {
                  await launchUrl(socials['linkedin'] ?? '');
                },
                splashColor: Colors.grey,
                child: SvgPicture.asset(
                  'assets/linkedin.svg',
                  height: 16,
                ),
              )
            ],
          )
        ],
      ),
    );
  }
}
