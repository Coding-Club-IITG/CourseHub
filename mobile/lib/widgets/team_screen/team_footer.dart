import '../../constants/themes.dart';
import 'package:flutter/material.dart';
import 'package:flutter_svg/svg.dart';

class TeamFooter extends StatelessWidget {
  const TeamFooter({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Themes.kYellow,
      padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          const Text(
            'We make the bugs disappear.\nWhat\'s your superpower?',
            style: TextStyle(color: Colors.black, fontWeight: FontWeight.w400),
            textAlign: TextAlign.center,
          ),
          const SizedBox(
            height: 20,
          ),
          Center(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                SvgPicture.asset('assets/cc_logo_b&w.svg'),
                const SizedBox(
                  width: 10,
                ),
                const Column(
                  children: [
                    Text(
                      'Coding Club',
                      style: TextStyle(color: Colors.black),
                    ),
                    Text(
                      'IIT Guwahati',
                      style: TextStyle(
                          color: Colors.black, fontWeight: FontWeight.w400),
                    ),
                  ],
                )
              ],
            ),
          ),
          const SizedBox(
            height: 20,
          )
        ],
      ),
    );
  }
}
