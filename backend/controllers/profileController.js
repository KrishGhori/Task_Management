import { Profile } from '../models/Profile.js'

const buildProfileResponse = (profile) => ({
  id: profile._id.toString(),
  userId: profile.userId.toString(),
  displayName: profile.displayName ?? '',
  phone: profile.phone ?? '',
  bio: profile.bio ?? '',
  avatarUrl: profile.avatarUrl ?? '',
  createdAt: profile.createdAt,
  updatedAt: profile.updatedAt,
})

const validateOptionalString = (value) =>
  value === undefined || typeof value === 'string'

export const getMyProfile = async (req, res) => {
  const profile = await Profile.findOne({ userId: req.user.id }).lean()
  if (!profile) {
    res.status(404).json({ message: 'Profile not found. Create profile first.' })
    return
  }

  res.json({ profile: buildProfileResponse(profile) })
}

export const createMyProfile = async (req, res) => {
  const { displayName = '', phone = '', bio = '', avatarUrl = '' } = req.body ?? {}

  if (
    !validateOptionalString(displayName) ||
    !validateOptionalString(phone) ||
    !validateOptionalString(bio) ||
    !validateOptionalString(avatarUrl)
  ) {
    res.status(400).json({ message: 'displayName, phone, bio, and avatarUrl must be strings.' })
    return
  }

  const existing = await Profile.findOne({ userId: req.user.id }).select('_id').lean()
  if (existing) {
    res.status(409).json({ message: 'Profile already exists for this user.' })
    return
  }

  const profile = await Profile.create({
    userId: req.user.id,
    displayName: displayName.trim(),
    phone: phone.trim(),
    bio: bio.trim(),
    avatarUrl: avatarUrl.trim(),
  })

  res.status(201).json({ profile: buildProfileResponse(profile), message: 'Profile created successfully.' })
}

export const updateMyProfile = async (req, res) => {
  const { displayName, phone, bio, avatarUrl } = req.body ?? {}

  if (
    !validateOptionalString(displayName) ||
    !validateOptionalString(phone) ||
    !validateOptionalString(bio) ||
    !validateOptionalString(avatarUrl)
  ) {
    res.status(400).json({ message: 'displayName, phone, bio, and avatarUrl must be strings.' })
    return
  }

  if (displayName === undefined && phone === undefined && bio === undefined && avatarUrl === undefined) {
    res.status(400).json({ message: 'Nothing to update.' })
    return
  }

  const profile = await Profile.findOne({ userId: req.user.id })
  if (!profile) {
    res.status(404).json({ message: 'Profile not found. Create profile first.' })
    return
  }

  if (displayName !== undefined) {
    profile.displayName = displayName.trim()
  }
  if (phone !== undefined) {
    profile.phone = phone.trim()
  }
  if (bio !== undefined) {
    profile.bio = bio.trim()
  }
  if (avatarUrl !== undefined) {
    profile.avatarUrl = avatarUrl.trim()
  }

  const updated = await profile.save()
  res.json({ profile: buildProfileResponse(updated), message: 'Profile updated successfully.' })
}
