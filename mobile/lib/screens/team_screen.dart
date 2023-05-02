import 'package:coursehub/constants/team.dart';
import 'package:coursehub/widgets/common/nav_bar.dart';
import 'package:coursehub/widgets/team_screen/photo_frame.dart';
import 'package:coursehub/widgets/team_screen/team_footer.dart';
import 'package:flutter/material.dart';
import 'package:flutter_staggered_animations/flutter_staggered_animations.dart';
import 'package:provider/provider.dart';

import '../providers/navigation_provider.dart';

class TeamScreen extends StatelessWidget {
  const TeamScreen({super.key});

  @override
  Widget build(BuildContext context) {
    List<Widget> teamFrame = [];
    teamFrame.add(
      const SizedBox(
        height: 20,
      ),
    );

    for (int i = 0; i < team.length; i++) {
      var e = team[i];
      if (i % 2 == 0) {
        teamFrame.add(
          LeftAlignedFrame(
            name: e['name'] ?? '',
            role: e['role'] ?? '',
            socials: {
              'github': e['github'] ?? '',
              'instagram': e['instagram'] ?? '',
              'linkedin': e['linkedin'] ?? '',
            },
            image: e['imageUrl'] ?? '',
          ),
        );
      } else {
        teamFrame.add(
          RightAlignedFrame(
            name: e['name'] ?? '',
            role: e['role'] ?? '',
            socials: {
              'github': e['github'] ?? '',
              'instagram': e['instagram'] ?? '',
              'linkedin': e['linkedin'] ?? '',
            },
            image: e['imageUrl'] ?? '',
          ),
        );
      }
    }

    List<Widget> children = [];

    children.add(
      Container(
        transform: Matrix4.translationValues(0.0, -10.0, 0.0),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
        child: Column(
          children: teamFrame,
        ),
      ),
    );
    children.add(const TeamFooter());

    final navigatorProvider = context.read<NavigationProvider>();
    return WillPopScope(
        onWillPop: () async {
          navigatorProvider.changePageNumber(0);
          return false;
        },
        child: Ink(
          color: Colors.black,
          child: AnimationLimiter(
            child: Column(
              children: [
                const NavBar(),
                Expanded(
                  child: ListView.builder(
                    itemCount: 2,
                    physics: const ClampingScrollPhysics(),
                    itemBuilder: (BuildContext context, int index) {
                      return AnimationConfiguration.staggeredList(
                        position: index,
                        duration: const Duration(milliseconds: 375),
                        child: FadeInAnimation(
                          child: children[index],
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
        ));
  }
}

class RightAlignedFrame extends StatelessWidget {
  final String name;
  final String role;
  final Map<String, String> socials;
  final String image;

  const RightAlignedFrame({
    super.key,
    required this.name,
    required this.role,
    required this.socials,
    required this.image,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      transform: Matrix4.translationValues(0, -30, 0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          SlideAnimation(
            horizontalOffset: -50,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(
                  height: 20,
                ),
                Text(
                  name,
                  style: const TextStyle(
                      fontWeight: FontWeight.w700, fontSize: 18),
                ),
                const SizedBox(
                  height: 8,
                ),
                Text(
                  role.toUpperCase(),
                  style: const TextStyle(
                      color: Color.fromRGBO(201, 201, 201, 1), fontSize: 14),
                ),
                const SizedBox(
                  height: 20,
                ),
              ],
            ),
          ),
          const SizedBox(
            width: 40,
          ),
          SlideAnimation(
            horizontalOffset: 50,
            child: Container(
              transform: Matrix4.rotationZ(0.1552),
              child: PhotoFrame(
                photo: image,
                socials: socials,
                name: name,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class LeftAlignedFrame extends StatelessWidget {
  final String name;
  final String role;
  final Map<String, String> socials;
  final String image;
  const LeftAlignedFrame({
    super.key,
    required this.name,
    required this.role,
    required this.socials,
    required this.image,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SlideAnimation(
          horizontalOffset: -50,
          child: Container(
            transform: Matrix4.rotationZ(-0.1552),
            child: PhotoFrame(
              photo: image,
              socials: socials,
              name:name,
            ),
          ),
        ),
        const SizedBox(
          width: 40,
        ),
        SlideAnimation(
          horizontalOffset: 50,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(
                height: 20,
              ),
              Text(
                name,
                style:
                    const TextStyle(fontWeight: FontWeight.w700, fontSize: 18),
              ),
              const SizedBox(
                height: 8,
              ),
              Text(
                role.toUpperCase(),
                style: const TextStyle(
                    color: Color.fromRGBO(201, 201, 201, 1), fontSize: 14),
              ),
              const SizedBox(
                height: 20,
              ),
            ],
          ),
        )
      ],
    );
  }
}
