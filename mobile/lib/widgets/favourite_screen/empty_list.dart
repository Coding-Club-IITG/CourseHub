import 'package:coursehub/constants/themes.dart';
import 'package:flutter/material.dart';

class EmptyList extends StatelessWidget {
  const EmptyList({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            'Nothing Here!',
            style: Themes.darkTextTheme.displayLarge,
          ),
          const SizedBox(
            height: 15,
          ),
          const Text(
            'Click on the "star" icon next to any\n file to add files to your favourites',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontWeight: FontWeight.w400,
              color: Color.fromRGBO(108, 108, 108, 1),
              fontSize: 14.0,
            ),
          ),
          const SizedBox(
            height: 20,
          ),
          Image.asset(
            'assets/my_profile_no_contri.png',
            width: 300,
          ),
        ],
      ),
    );
  }
}